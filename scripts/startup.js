
async function startup() {
    let current_data = await load_json_data("database") ?? false;
    
    console.log("Current data:", current_data);

    let api_update;

    if (current_data) {
        console.log("Current data found");
        database = current_data;
        api_update = fetch(`${API_URL}${UPDATE_IF_STALE(database.timestamp)}`);
        removeFader();    
    } else {
        api_update = fetch(`${API_URL}${FULL_UPDATE}`);
    }

    api_update = await api_update;

    let response = await api_update.json();


    if (response != undefined && response != "No update needed") {
        database = response;
        removeFader();
        await save_json_data("database", database);
    } else {
        removeFader();
    }

    console.log(`Loaded database with ${database.catalog.length} courses`);

    console.log("Preparing database...");
    console.time("Preparing database");
    database.catalog.forEach(t => t.small_description = t.description.substring(0, 100));
    database.catalog.forEach(t => t.filePrepared = fuzzysort.prepare(t.file))
    console.timeEnd("Preparing database");

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const search = urlParams.get('search');

    if (search) {
        document.getElementById("search-bar").value = search;
        submitSearch();
    }

    document.getElementById("search-bar").focus();
}

function removeFader() {
    console.log("Removing fader");
}

startup();