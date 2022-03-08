function expensiveCourseSearch(input, all_courses_global, colors, hmc_mode) {
	let results = [];

	if (input == "") {
		return results;
	} else {
		const filters_object = getFilters(input);

		const search_term = tweakSearch(filters_object.input, all_courses_global);

		console.log(`${filters_object.input} => ${search_term}`);

		results = search_courses(search_term, all_courses_global, filters_object.filters, hmc_mode);
	}

	let output = [];

	for (let i = 0; i < results.length; i++) {
		let course = results[i].obj ?? results[i];
		let course_div = createResultDiv(course, colors[i % colors.length], i);

		output.push(course_div);
	}

	return output;
}

function createResultDiv(course, color, descIndex) {
	let course_div = document.createElement("div");
	course_div.classList.add("catalog-search-result");
	course_div.id = `catalog-search-result-${descIndex}`;
	course_div.style.backgroundColor = `var(--color-${color})`;
	course_div.onclick = function () {
		toggleSelected(`${descIndex}`);
	};

	let course_code = document.createElement("div");
	course_code.classList.add("identifier");
	course_code.innerHTML = course.identifier;

	course_div.appendChild(course_code);

	let course_name = document.createElement("div");
	course_name.classList.add("title");
	course_name.innerHTML = course.title;

	course_div.appendChild(course_name);

	let credits_desc = document.createElement("div");
	credits_desc.classList.add("credits");
	credits_desc.innerHTML = `<b>${(course.credits / 100).toFixed(2)} credits</b> at <b>${schoolToAbbreviation(course.source)}</b>`;

	course_div.appendChild(credits_desc);

	let offered_div = document.createElement("div");
	offered_div.classList.add("offered");
	if (course.currently_offered) {
		offered_div.innerHTML = `<b><a href="https://5scheduler.io?search=${course.identifier}" target='_blank'>Currently offered (5scheduler.io)</a></b><br>`;
	}

	if (course.offered != "") {
		offered_div.innerHTML += `<b>Offered:</b> ${course.offered}`;
	}
	course_div.appendChild(offered_div);

	if (course.prerequisites != "") {
		let prereqs_div = document.createElement("div");
		prereqs_div.classList.add("prereqs");
		prereqs_div.innerHTML = `<b>Prerequisites:</b> ${course.prerequisites}`;

		course_div.appendChild(prereqs_div);
	}

	if (course.corequisites != "") {
		let coreqs_div = document.createElement("div");
		coreqs_div.classList.add("coreqs");
		coreqs_div.innerHTML = `<b>Corequisites:</b> ${course.corequisites}`;

		course_div.appendChild(coreqs_div);
	}

	let course_desc = document.createElement("div");
	course_desc.classList.add("desc");
	course_desc.innerHTML = course.description;

	course_div.appendChild(course_desc);

	let school_tag = document.createElement("div");
	school_tag.classList.add("school");
	school_tag.classList.add(course.source);
	school_tag.innerHTML = `<b>${schoolToReadable(course.source)}</b>`;

	course_div.appendChild(school_tag);

	return course_div;
}


function tweakSearch(string) {
	let return_string = string.toLowerCase();

	// Common replacements
	// Type can be "full", "number", or "any"
	// Full only matches full tokens/words separated by spaces
	// Number matches any phrase next to a number, but keeps the number
	const replacements = [
		{ type: "full", search: "cs", replace: "csci" },
		{ type: "full", search: "e", replace: "engr" },
		{ type: "full", search: "hmc", replace: "HarveyMudd" },
		{ type: "full", search: "cmc", replace: "ClaremontMckenna" },
		{ type: "full", search: "harvey mudd", replace: "HarveyMudd" },
		{ type: "full", search: "claremont mckenna", replace: "ClaremontMckenna" },
	];

	for (let replacement of replacements) {
		if (replacement.type == "full") {
			return_string = return_string.replaceAll(new RegExp(`\\b${replacement.search}\\b`, 'g'), replacement.replace);
			let regex = new RegExp(`\\b(${replacement.search})([0-9]+)\\b`, 'g');

			// Find matches
			let matches = [...return_string.matchAll(regex)];
			
			// Replace matches with the replacement and number
			for (let match of matches) {
				return_string = return_string.replaceAll(match[0], `${replacement.replace}${match[2]}`);
			}
		} else if (replacement.type == "any") {
			return_string = return_string.replaceAll(replacement.search, replacement.replace);
		}
	}

	// Pad all numbers to 3 digits with 0s
	return_string = return_string.replaceAll(/([0-9]+)/g, (match) => {
		return match.padStart(3, "0");
	});

	return return_string.trim().toLowerCase();
}

function search_courses(query, all_courses_global, filters, hmc_mode) {
	let results = [];

	if (query.trim() == "") {
		results = all_courses_global;
	} else {
		if (query.includes(" ")) {
			const terms = query.split(" ");
			for (let search_term of terms) {
				let temp_results = fuzzysort.go(search_term.trim(), all_courses_global, options);

				if (results.length > 0) {
					results = results.filter(t => temp_results.map(t => t.obj.identifier).includes(t.obj.identifier));
				} else {
					results = temp_results;
				}
			}

			results = results.sort((a, b) => b.score - a.score);

		} else {
			results = fuzzysort.go(query, all_courses_global, options);
		}
	}

	// Apply filters
	for (let key of Object.keys(filters)) {
		if (key == "at") {
			results = results.filter(t => (t.obj || t).source == toApiSchool(filters[key]));
		} else if (key == "prereq") {
			if (filters[key].toLowerCase() == "none") {
				results = results.filter(t => (t.obj || t).prerequisites.length == 0);
			} else if (filters[key].toLowerCase() == "some") {
				results = results.filter(t => (t.obj || t).prerequisites.length > 0);
			} else {
				results = results.filter(t => (t.obj || t).prerequisites == filters[key]);
			}
		} else if (key == "coreq") {
			if (filters[key].toLowerCase() == "none") {
				results = results.filter(t => (t.obj || t).corequisites.length == 0);
			} else if (filters[key].toLowerCase() == "some") {
				results = results.filter(t => (t.obj || t).corequisites.length > 0);
			} else {
				results = results.filter(t => (t.obj || t).corequisites == filters[key]);
			}
		} else if (key == "after" || key == "before") {
			let time_to_search = [0, 0];

			let time = filters[key].toLowerCase();
			let offset = 0;

			// Convert to 24 hour time
			if (time.includes("p")) {
				time = time.split("p")[0];

				if (time.substring(0, 2) != "12") {
					offset = 12;
				}

			} else if (time.includes("a")) {
				time.split("a")[0];

				if (time.substring(0, 2) == "12") {
					offset = -12;
				}
			}

			// Parse either just hour
			let hour = parseInt(time);

			if (hour != NaN) {
				time_to_search = [hour + offset, 0];
			} else {
				return;
			}

			results = results.filter(t => (t.obj || t).timing.some(e => {
				// Return false if day is not included in "on" filter
				if (filters["on"] != null) {
					let days_to_search = filters["on"].split(",").map(day => capitalize(day));
					if (!e.days.some(l => days_to_search.includes(l))) {
						return false;
					}
				}

				if (key == "after") {
					let start_time = e.start_time.split(":").map(i => parseInt(i));
					if (timeDiffMins(time_to_search, start_time) >= 0) {
						return true;
					}
				} else {
					let end_time = e.end_time.split(":").map(i => parseInt(i));
					if (timeDiffMins(time_to_search, end_time) <= 0) {
						return true;
					}
				}
			}));
		}
	}

	return results;
}

function toApiSchool(school) {
	let l_school = school.toLowerCase();
	if (["hmc", "hm", "harvey", "mudd", "harveymudd", "harvey-mudd"].includes(l_school)) {
		return "HarveyMudd";
	} else if (["cmc", "cm", "claremont", "mckenna", "claremontmckenna", "claremont-mckenna"].includes(l_school)) {
		return "ClaremontMckenna";
	} else if (["scripps", "scripp", "scrps", "scrip", "scrips", "sc"].includes(l_school)) {
		return "Scripps";
	} else if (["pm", "po", "pomona", "pomna", "pom"].includes(l_school)) {
		return "Pomona"
	} else if (["pz", "pitz", "pitzer", "pitze", "ptz"].includes(l_school)) {
		return "Pitzer"
	}
}

function join_results(arr1, arr2) {
	return arr1.concat(arr2.filter((t, i) => !arr1.map(t => t.obj.identifier).includes(t.obj.identifier)))
}

function capitalize(s) {
	return s && s[0].toUpperCase() + s.slice(1);
}

// Gets any pair of "key:value" pairs from the query string
// and returns both as an object
function getFilters(input) {
	let split = input.split(" ");

	let filters = {};
	let wanted_search_term = "";

	for (let part of split) {
		if (part.includes(":")) {
			let split_part = part.split(":");
			filters[split_part[0]] = split_part[1];
		} else {
			wanted_search_term += part + " ";
		}
	}

	wanted_search_term = wanted_search_term.trim();

	return { filters: filters, input: wanted_search_term };
}

function schoolToReadable(school) {
	switch (school) {
		case "HarveyMudd":
			return "Harvey Mudd College";
		case "ClaremontMckenna":
			return "Claremont McKenna College";
		case "Pomona":
			return "Pomona College";
		case "Pitzer":
			return "Pitzer College";
		case "Scripps":
			return "Scripps College";
	}
}

function schoolToAbbreviation(school) {
	switch (school) {
		case "HarveyMudd":
			return "HMC";
		case "ClaremontMckenna":
			return "CMC";
		case "Pomona":
			return "Pomona";
		case "Pitzer":
			return "Pitzer";
		case "Scripps":
			return "Scripps";
	}
}