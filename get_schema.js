async function run() {
  const url = 'https://trcborqqqvdcdxqurlxg.supabase.co/rest/v1/?apikey=sb_publishable_UTGoQX5Q0rY3EBOfj7aJCw_YvIK_Shb';
  const response = await fetch(url);
  const data = await response.json();
  console.log(Object.keys(data));
  if (data.definitions) {
    console.log("definitions.posts exists:", !!data.definitions.posts);
    if (!data.definitions.posts) console.log(Object.keys(data.definitions));
  }
}

run().catch(console.error);
