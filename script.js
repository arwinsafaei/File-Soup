const addFiles = document.getElementById("add-files");
const fileInput = document.getElementById("file-input");
const fileList = document.getElementById("file-list");
const emptyMessage = document.getElementById("empty");
const processingProgress = document.getElementById("processing-progress");
const processingStatus = document.getElementById("processing-status");
const encodeButton = document.getElementById("encode-button");
const exportButton = document.getElementById("export-button");
const outputInfo = document.getElementById("output-info");

let files = [];
let nextFileId = 0;
let currentSoupBlob = null;
let displayedProgress = 0;

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

function updateProgress(value) {
    displayedProgress = Math.max(displayedProgress, value);
    processingProgress.value = displayedProgress;
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

            currentSoupBlob = null;
            exportButton.disabled = true;
            outputInfo.textContent = "Ingredients changed. Cook a new bowl!";

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

async function encodeZipToPNG(zipBlob, onProgress) {
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());

    const header = new Uint8Array(16);
    const magic = new TextEncoder().encode("SOUPPNG1");

    header.set(magic, 0);

    const headerView = new DataView(header.buffer);
    headerView.setBigUint64(8, BigInt(zipBytes.length), false);

    const payload = new Uint8Array(header.length + zipBytes.length);
    payload.set(header, 0);
    payload.set(zipBytes, header.length);

    const width = Math.min(4096, Math.ceil(Math.sqrt(payload.length / 3)));

    const height = Math.ceil(payload.length / (width * 3));

    if (width * height > 16777216) {
        throw new Error("Soup is too large for this browser canvas");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", {
        willReadFrequently: true
    });

    if (!context) {
        throw new Error("Could not create PNG canvas.");
    }

    const imageData = context.createImageData(width, height);
    const pixels = imageData.data;

    const progressInterval = Math.max(1, Math.floor(payload.length / 100));

    for (let i = 0; i < payload.length; i++) {
        const pixelIndex = Math.floor(i / 3) * 4;
        const channel = i % 3;

        pixels[pixelIndex + channel] = payload[i];

        if (i % progressInterval === 0) {
            onProgress(80 + (i / payload.length) * 20);
        }
    }

    for (let i = 3; i < pixels.length; i += 4) {
        pixels[i] = 255;
    }

    context.putImageData(imageData, 0, 0);

    const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if(blob) {
                resolve(blob);
            } else {
                reject(new Error("PNG generation failed."));
            }
        }, "image/png");
    });

    return pngBlob;
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
        }, metadata => {
            updateProgress(metadata.percent * 0.8);
        });
        processingStatus.textContent = "Making some good product pictures...";

        const soupBlob = await encodeZipToPNG(zipBlob, progress => {
            updateProgress(progress);
        });
        currentSoupBlob = soupBlob;
        updateProgress(100);

        outputInfo.textContent = `Soup ready! ${files.length} ingredient(s), ${formatFileSize(soupBlob.size)}.`;

        processingStatus.textContent = "Soup cooked!";
        exportButton.disabled = false;
    } catch (error) {
        console.error("ZIP creation failed:", error);

        currentSoupBlob = null;
        exportButton.disabled = true;
        outputInfo.textContent = "Something went wrong in the kitchen... ORPHEUS NO-";
        processingStatus.textContent = "The kitchen screwed up...";
    }

    encodeButton.disabled = false;
    updateProgress(0);
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

    currentSoupBlob = null;
    exportButton.disabled = true;
    fileInput.value = "";

    renderFiles();

    if (files.length > 0) {
        processingStatus.textContent = `Ready to cook - ${files.length} ingredient(s)`;
    }
});

encodeButton.addEventListener("click", createZip);

exportButton.addEventListener("click", () => {
    if (!currentSoupBlob) return;

    const downloadBlob = new Blob([currentSoupBlob], {
        type: "application/octet-stream"
    });
    const url = URL.createObjectURL(downloadBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "thisisabowlofsoup.souplol";
    link.type = "application/octet-stream";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
});