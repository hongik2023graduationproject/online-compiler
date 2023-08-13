const textarea = document.querySelector("textarea");
const lineNumbers = document.querySelector(".line-numbers");

textarea.addEventListener("keyup", (event) => {
    const numberOfLines = event.target.value.split("\n").length;

    lineNumbers.innerHTML = Array(numberOfLines).fill("<span></span>").join("");
});

textarea.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        textarea.value =
            textarea.value.substring(0, start) +
            "\t" +
            textarea.value.substring(end);

        event.preventDefault();
    }
});
