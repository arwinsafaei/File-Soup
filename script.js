const addFiles = document.getElementById("add-files");
const fileInput = document.getElementById("file-input");
const fileList = document.getElementById("file-list");
const emptyMessage = document.getElementById("empty");
const processingStatus = document.getElementById("processing-status");
const encodeButton = document.getElementById("encode-button");
const exportButton = document.getElementById("export-button");
const outputInfo = document.getElementById("output-info");

let files = [];
let nextFileId = 0;
let currentZipBlob = null;

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

function getUniqueZipName(name, usedNames) {
    const dotIndex = name.lastIndexOf(".");

    const hasExtension = dotIndex > 0;
    const baseName = hasExtension ? name.slice(0, dotIndex) : name;
    const extension = hasExtension ? name.slice(dotIndex) :"";

    let uniqueName = name;
    let counter = 2;

    while (usedNames.has(uniqueName.toLowerCase())) {
        uniqueName = `${baseName} (${counter})${extension}`;
        counter++;
    }

    usedNames.add(uniqueName.toLowerCase());

    return uniqueName;
}

async function createZip() {
    if (files.length === 0) {
        processingStatus.textContent = "The pot is empty!";
        return;
    }

    encodeButton.disabled = true;
    exportButton.disabled = true;

    processingStatus.textContent = "Packing ingredients...";
    outputInfo.textContent = "Cooking your ingredients together...";

    try {
        const zip = new JSZip();
        const usedNames = new Set();

        for (const file of files) {
            const originalFile = file.file;

            const zipName = getUniqueZipName(originalFile.name, usedNames);

            zip.file(zipName, originalFile);
        }

        const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 6
            }
        });

        currentZipBlob = zipBlob;

        outputInfo.textContent = `Soup package ready! ${files.length} ingredient(s), ${formatFileSize(zipBlob.size)}.`;

        processingStatus.textContent = "Soup package cooked!";
        exportButton.disabled = false;
    } catch (error) {
        console.error("ZIP creation failed:", error);

        currentZipBlob = null;
        outputInfo.textContent = "Something went wrong in the kitchen... ORPHEUS NO-";
        processingStatus.textContent = "The kitchen screwed up...";
    }

    encodeButton.disabled = false;
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

    currentZipBlob = null;
    exportButton.disabled = true;
    fileInput.value = "";

    renderFiles();

    if (files.length > 0) {
        processingStatus.textContent = `Ready to cook - ${files.length} ingredient(s)`;
    }
});

encodeButton.addEventListener("click", createZip);

exportButton.addEventListener("click", () => {
    if (!currentZipBlob) return;

    const url = URL.createObjectURL(currentZipBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "soup.zip"

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});