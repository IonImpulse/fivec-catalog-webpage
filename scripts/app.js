const API_URL = "https://api.5scheduler.io/"
const FULL_UPDATE = "fullYearCatalog";
const UPDATE_IF_STALE = function (timestamp) { return "getCatalogIfStale/" + timestamp; }
const STATUS = "status"

function toggle_theme() {
	if (document.documentElement.getAttribute("data-theme") != "dark") {
		document.documentElement.setAttribute('data-theme', 'dark');
		colors = colors_dark
		localStorage.setItem("theme", "dark");
	}
	else {
		document.documentElement.setAttribute('data-theme', 'light');
		colors = colors_light
		localStorage.setItem("theme", "light");
	}
}

async function load_json_data(name) {
    return localforage.getItem(name);
}

async function save_json_data(name, data) {
    return localforage.setItem(name, data);
}

function replaceHtml(el, html) {
	var oldEl = typeof el === "string" ? document.getElementById(el) : el;
	/*@cc_on // Pure innerHTML is slightly faster in IE
		oldEl.innerHTML = html;
		return oldEl;
	@*/
	var newEl = oldEl.cloneNode(false);
	newEl.innerHTML = html;
	oldEl.parentNode.replaceChild(newEl, oldEl);
	/* Since we just removed the old element from the DOM, return a reference
	to the new element, which can be used to restore variable references. */
	return newEl;
};

async function submitSearch() {
    let search = document.getElementById("search-bar").value;

    console.log("Searching for:", search);

    let obj = { Title: window.location.title, Url: (window.location.href.split("?")[0] ?? window.location.href) + `?search=${search}` };  

    history.pushState(obj, obj.Title, obj.Url);  

    console.time("Search");

    let results = expensiveCourseSearch(search, database.catalog, colors, false);

    let result_node = document.createElement("div");
    result_node.id = "search-results";

    if (results.length == 0) {
        result_node.innerHTML = `<div class="no-results">No results found</div>`;
    } else {
        for (let i = 0; i < results.length; i++) {
            result_node.appendChild(results[i]);
        }       
    }

    console.timeEnd("Search");

    let output = document.getElementById("search-results");

    output.replaceWith(result_node);
}

function toggleSelected(index) {
    let el = document.getElementById(`catalog-search-result-${index}`);
    
    Swal.fire({
        title: "",
        html: `<div class="swal-course-popup">${el.innerHTML}</div`,
        customClass: {
			popup: 'swal-course-popup',
			confirmButton: 'default-button swal confirm',
			cancelButton: 'default-button swal cancel',
		},
		buttonsStyling: false,
        showConfirmButton: false,
    });
}