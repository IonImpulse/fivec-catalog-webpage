const colors = [
    1,2,3,4,5,6,7,8,9
];

var database = {
    catalog: [],
    timestamp: 0,
};

var vertical_layout = false;

const options = {
    limit: 100, // don't return more results than you need!
    allowTypo: true, // if you don't care about allowing typos
    threshold: 0, // don't return bad results
    keys: ['title', 'identifier', 'small_description'], // keys to search
}

// *****
// Prelude functions
// *****
function getTheme() {
    let theme = localStorage.getItem("theme");
    if (theme == null) {
        const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
        if (darkThemeMq.matches) {
            theme = "dark";
        } else {
            theme = "light";
        }
        localStorage.setItem("theme", theme);
    }

    if (theme == "light") {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

function isVerticalLayout() {
    vertical_layout = window.matchMedia("only screen and (max-width: 760px)").matches;
    return vertical_layout;
}

document.addEventListener("keydown", function (event) {
    if (event.code === "Enter") {
        document.activeElement.click();
    }
});


getTheme();
isVerticalLayout();