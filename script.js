const addFiles = document.getElementById("add-files");
const fileInput = document.getElementById("file-input");
const fileList = document.getElementById("file-list");
const emptyMessage = document.getElementById("empty");
const processingStatus = document.getElementById("processing-status");

let files = [];
let nextFileId = 0;

function formatFileSize(bytes) {
    if (bytes < 1000) {
        return `${bytes} B`;
    }

    if (bytes < 1000000) {
        return `${(bytes / 1000).toFixed(1)} KB`;
    }

    if (bytes < 1000000000) {
        return `${(bytes / 1000000).toFixed(1)} MB`;
    }

    return `${(bytes / 1000000000).toFixed(2)} GB`;
}

function renderFiles() {
    emptyMessage.hidden = files.length > 0;

    for (const row of fileList.querySelectorAll(".file-row")) {
        row.remove();
    }

    for (const file of files) {
        const row = document.createElement("div");
        row.className = "file-row";

        const details = document.createElement("div");
        details.className = "file-details";

        const name = document.createElement("div");
        name.className = "file-name";
        name.textContent = file.file.name;

        const size = document.createElement("span");
        size.className = "file-size";
        size.textContent = formatFileSize(file.file.size);

        const remove = document.createElement("button");
        remove.className = "remove-file"
        remove.textContent = "Throw it in the bin";

        remove.addEventListener("click", () => {
            files = files.filter(item => item.id !== file.id);

            renderFiles();
        });

        details.append(name, size);
        row.append(details, remove);
        fileList.append(row);
    }
}

addFiles.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    const selectedFiles = Array.from(fileInput.files);

    for (const file of selectedFiles) {
        files.push({
            id: nextFileId++,
            file: file
        });
    }

    fileInput.value = "";

    renderFiles();

    if (files.length > 0) {
        processingStatus.textContent = `Ready to cook - ${ingredients.length} ingredient(s)`;
    }
});