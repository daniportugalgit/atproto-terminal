const dotenv = require("dotenv");
const { AtpAgent } = require("@atproto/api");

dotenv.config();

const username = process.env.ATP_USERNAME;
const password = process.env.ATP_PASSWORD;

async function main() {
  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: username, password });

  const did = agent.session?.did;
  if (!did) throw new Error("Failed to get DID from session");

  let cursor = undefined;
  let totalDeleted = 0;

  console.log(`Fetching follow records from your repo...`);

  while (true) {
    const res = await agent.api.com.atproto.repo.listRecords({
      repo: did,
      collection: "app.bsky.graph.follow",
      limit: 100,
      cursor,
    });

    for (const record of res.data.records) {
      const subjectDid = record.value?.subject;
      const rkey = record.uri.split("/").pop();

      try {
        await agent.api.com.atproto.repo.deleteRecord({
          repo: did,
          collection: "app.bsky.graph.follow",
          rkey,
        });
        console.log(`Unfollowed ${subjectDid}`);
        totalDeleted++;
      } catch (err) {
        console.error(`Failed to unfollow ${subjectDid}:`, err.message);
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    if (!res.data.cursor) break;
    cursor = res.data.cursor;
  }

  console.log(`✅ Done. Total unfollowed: ${totalDeleted}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
