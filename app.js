// Carousel Assembler: all files and canvas operations remain inside the browser.
(() => {
  "use strict";

  const state = { slides: [], draggedId: null, logo: null, exporting: false };
  const $ = (selector) => document.querySelector(selector);
  const elements = {};
  [
    "fileInput", "addButton", "dropZone", "slideList", "emptyHint", "sizeSelect", "customSize", "customWidth", "customHeight",
    "qualityControl", "quality", "qualityValue", "previewEmpty", "previewStrip", "summarySlides", "summarySlideSize",
    "summaryFinalSize", "summaryFormat", "mobileWarning", "manySlidesWarning", "exportButton", "exportSlidesButton", "statusMessage",
    "logoEnabled", "logoButton", "logoInput", "logoPreview", "removeLogo", "logoScope", "logoRangeWrap", "logoRange", "logoPosition",
    "logoSize", "logoSizeValue", "logoMargin", "logoMarginValue", "logoOpacity", "logoOpacityValue", "logoKeepRatio",
    "numberEnabled", "numberFormat", "numberPosition", "numberSize", "numberSizeValue", "numberColor", "numberOpacity",
    "numberOpacityValue", "numberMargin", "numberMarginValue", "numberBackground", "numberBackgroundOptions",
    "numberBackgroundColor", "numberBackgroundOpacity", "numberBackgroundOpacityValue", "numberPadding", "numberPaddingValue",
    "numberRadius", "numberRadiusValue"
  ].forEach((id) => { elements[id] = $(`#${id}`); });

  const getChecked = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const waitFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  function getSize() {
    if (elements.sizeSelect.value !== "custom") {
      const [width, height] = elements.sizeSelect.value.split("x").map(Number);
      return { width, height };
    }
    return {
      width: Math.max(1, Math.min(10000, Number(elements.customWidth.value) || 1)),
      height: Math.max(1, Math.min(10000, Number(elements.customHeight.value) || 1))
    };
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function addFiles(files) {
    const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return setStatus("Selecciona archivos de imagen válidos.", true);
    const loaded = (await Promise.all(imageFiles.map(loadImageFile))).filter(Boolean);
    state.slides.push(...loaded);
    setStatus(`${loaded.length} imagen(es) añadida(s).`);
    render();
  }

  function loadImageFile(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => resolve({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, file, url, image });
      image.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      image.src = url;
    });
  }

  async function loadLogo(file) {
    if (!file || !["image/png", "image/svg+xml"].includes(file.type)) return setStatus("El logo debe ser PNG o SVG.", true);
    const loaded = await loadImageFile(file);
    if (!loaded) return setStatus("No se pudo leer el logo.", true);
    if (state.logo) URL.revokeObjectURL(state.logo.url);
    state.logo = loaded;
    elements.logoEnabled.disabled = false;
    elements.logoEnabled.checked = true;
    elements.removeLogo.disabled = false;
    elements.logoPreview.replaceChildren(Object.assign(document.createElement("img"), { src: loaded.url, alt: "Vista previa del logo" }));
    setStatus("Logo cargado.");
    render();
  }

  function removeLogo() {
    if (state.logo) URL.revokeObjectURL(state.logo.url);
    state.logo = null;
    elements.logoEnabled.checked = false;
    elements.logoEnabled.disabled = true;
    elements.removeLogo.disabled = true;
    elements.logoInput.value = "";
    elements.logoPreview.innerHTML = "<span>Sin logo</span>";
    render();
  }

  function moveSlide(id, offset) {
    const index = state.slides.findIndex((slide) => slide.id === id);
    const destination = index + offset;
    if (index < 0 || destination < 0 || destination >= state.slides.length) return;
    [state.slides[index], state.slides[destination]] = [state.slides[destination], state.slides[index]];
    render();
  }

  function deleteSlide(id) {
    const index = state.slides.findIndex((slide) => slide.id === id);
    if (index < 0) return;
    URL.revokeObjectURL(state.slides[index].url);
    state.slides.splice(index, 1);
    render();
  }

  function renderSlides() {
    elements.slideList.replaceChildren();
    state.slides.forEach((slide, index) => {
      const card = document.createElement("article");
      card.className = "slide-card";
      card.draggable = true;
      card.innerHTML = `<span class="drag-handle" title="Arrastrar para ordenar" aria-hidden="true">⠿</span>
        <img class="thumb" src="${slide.url}" alt="Miniatura del slide ${index + 1}" />
        <div class="slide-info"><strong>${index + 1}. ${escapeHtml(slide.file.name)}</strong><small>${slide.image.naturalWidth} × ${slide.image.naturalHeight} · ${formatBytes(slide.file.size)}</small></div>
        <div class="move-actions" aria-label="Mover slide ${index + 1}"><button class="icon-button move-left" type="button" aria-label="Mover a la izquierda" ${index === 0 ? "disabled" : ""}>←</button><button class="icon-button move-right" type="button" aria-label="Mover a la derecha" ${index === state.slides.length - 1 ? "disabled" : ""}>→</button></div>
        <button class="icon-button delete-button" type="button" aria-label="Eliminar slide ${index + 1}">×</button>`;
      card.querySelector(".move-left").onclick = () => moveSlide(slide.id, -1);
      card.querySelector(".move-right").onclick = () => moveSlide(slide.id, 1);
      card.querySelector(".delete-button").onclick = () => deleteSlide(slide.id);
      card.ondragstart = () => { state.draggedId = slide.id; card.classList.add("dragging"); };
      card.ondragend = () => { state.draggedId = null; card.classList.remove("dragging"); };
      card.ondragover = (event) => event.preventDefault();
      card.ondrop = (event) => {
        event.preventDefault();
        if (!state.draggedId || state.draggedId === slide.id) return;
        const from = state.slides.findIndex((item) => item.id === state.draggedId);
        const to = state.slides.findIndex((item) => item.id === slide.id);
        const [moved] = state.slides.splice(from, 1);
        state.slides.splice(to, 0, moved);
        render();
      };
      elements.slideList.append(card);
    });
  }

  function logoApplies(index) {
    if (!state.logo || !elements.logoEnabled.checked) return false;
    const number = index + 1;
    switch (elements.logoScope.value) {
      case "first": return index === 0;
      case "last": return index === state.slides.length - 1;
      case "except-first": return index > 0;
      case "range": {
        const match = elements.logoRange.value.trim().match(/^(\d+)\s*-\s*(\d+)$/);
        return Boolean(match && number >= Number(match[1]) && number <= Number(match[2]));
      }
      default: return true;
    }
  }

  function positionBox(position, boxWidth, boxHeight, width, height, margin) {
    const centered = position.endsWith("center");
    const right = position.endsWith("right");
    const bottom = position.startsWith("bottom");
    return {
      x: centered ? (width - boxWidth) / 2 : right ? width - margin - boxWidth : margin,
      y: bottom ? height - margin - boxHeight : margin
    };
  }

  function drawBase(ctx, image, x, width, height, fit, background, forceSolid) {
    if (background !== "transparent" || forceSolid) {
      ctx.fillStyle = background === "transparent" ? "#ffffff" : background;
      ctx.fillRect(x, 0, width, height);
    }
    const scale = fit === "cover" ? Math.max(width / image.naturalWidth, height / image.naturalHeight) : Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawLogo(ctx, index, xOffset, width, height, unitScale) {
    if (!logoApplies(index)) return;
    const logoWidth = width * Number(elements.logoSize.value) / 100;
    const logoHeight = elements.logoKeepRatio.checked ? logoWidth * state.logo.image.naturalHeight / state.logo.image.naturalWidth : logoWidth;
    const margin = Number(elements.logoMargin.value) * unitScale;
    const point = positionBox(elements.logoPosition.value, logoWidth, logoHeight, width, height, margin);
    ctx.save();
    ctx.globalAlpha = Number(elements.logoOpacity.value) / 100;
    ctx.drawImage(state.logo.image, xOffset + point.x, point.y, logoWidth, logoHeight);
    ctx.restore();
  }

  function numberText(index) {
    const number = index + 1;
    const padded = String(number).padStart(2, "0");
    if (elements.numberFormat.value === "n-total") return `${number}/${state.slides.length}`;
    if (elements.numberFormat.value === "nn") return padded;
    if (elements.numberFormat.value === "nn-total") return `${padded}/${String(state.slides.length).padStart(2, "0")}`;
    return String(number);
  }

  function drawNumber(ctx, index, xOffset, width, height, unitScale) {
    if (!elements.numberEnabled.checked) return;
    const fontSize = Number(elements.numberSize.value) * unitScale;
    const padding = Number(elements.numberPadding.value) * unitScale;
    const text = numberText(index);
    ctx.save();
    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = "middle";
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = fontSize * 1.25 + padding * 2;
    const margin = Number(elements.numberMargin.value) * unitScale;
    const point = positionBox(elements.numberPosition.value, boxWidth, boxHeight, width, height, margin);
    if (elements.numberBackground.checked) {
      ctx.globalAlpha = Number(elements.numberBackgroundOpacity.value) / 100;
      ctx.fillStyle = elements.numberBackgroundColor.value;
      roundedRect(ctx, xOffset + point.x, point.y, boxWidth, boxHeight, Number(elements.numberRadius.value) * unitScale);
      ctx.fill();
    }
    ctx.globalAlpha = Number(elements.numberOpacity.value) / 100;
    ctx.fillStyle = elements.numberColor.value;
    ctx.textAlign = "center";
    ctx.fillText(text, xOffset + point.x + boxWidth / 2, point.y + boxHeight / 2);
    ctx.restore();
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, width, height, r) : ctx.rect(x, y, width, height);
  }

  function composeSlide(ctx, slide, index, x, width, height, unitScale, forceSolid = false) {
    drawBase(ctx, slide.image, x, width, height, getChecked("fit"), getChecked("background"), forceSolid);
    drawLogo(ctx, index, x, width, height, unitScale);
    drawNumber(ctx, index, x, width, height, unitScale);
  }

  function renderPreview() {
    const source = getSize();
    const height = Math.min(260, Math.max(190, source.height / source.width * 180));
    const width = height * source.width / source.height;
    const scale = width / source.width;
    elements.previewStrip.replaceChildren();
    state.slides.forEach((slide, index) => {
      const canvas = document.createElement("canvas");
      canvas.className = "preview-slide";
      canvas.width = Math.round(width * 2);
      canvas.height = Math.round(height * 2);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      composeSlide(ctx, slide, index, 0, width, height, scale);
      elements.previewStrip.append(canvas);
    });
    elements.previewEmpty.hidden = state.slides.length > 0;
  }

  function renderSummary() {
    const { width, height } = getSize();
    const finalWidth = width * state.slides.length;
    const format = getChecked("format");
    elements.summarySlides.textContent = state.slides.length;
    elements.summarySlideSize.textContent = `${width} × ${height} px`;
    elements.summaryFinalSize.textContent = `${finalWidth.toLocaleString("es")} × ${height.toLocaleString("es")} px`;
    elements.summaryFormat.textContent = format === "png" ? "PNG" : `JPG · ${elements.quality.value}%`;
    elements.mobileWarning.hidden = finalWidth * height * 4 < 64 * 1024 * 1024 && finalWidth < 16384;
    elements.manySlidesWarning.hidden = state.slides.length <= 12;
    elements.exportButton.disabled = state.slides.length === 0 || state.exporting;
    elements.exportSlidesButton.disabled = state.slides.length === 0 || state.exporting;
  }

  function render() {
    renderSlides();
    renderPreview();
    renderSummary();
    elements.emptyHint.hidden = state.slides.length > 0;
  }

  function createCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    if (canvas.width !== width || canvas.height !== height) throw new Error("El navegador no admite un lienzo de este tamaño.");
    return canvas;
  }

  function canvasToBlob(canvas) {
    const format = getChecked("format");
    return new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, Number(elements.quality.value) / 100));
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  }

  async function runExport(action) {
    state.exporting = true;
    renderSummary();
    setStatus("Preparando la exportación…");
    await waitFrame();
    try { await action(); }
    catch (error) { setStatus(error.message || "No se pudo exportar.", true); }
    finally { state.exporting = false; renderSummary(); }
  }

  function warnJpegTransparency() {
    if (getChecked("format") === "jpeg" && getChecked("background") === "transparent") setStatus("JPG no admite transparencia: se usará un fondo blanco.");
  }

  async function exportCarousel() {
    await runExport(async () => {
      const { width, height } = getSize();
      const canvas = createCanvas(width * state.slides.length, height);
      const ctx = canvas.getContext("2d");
      const forceSolid = getChecked("format") === "jpeg";
      state.slides.forEach((slide, index) => composeSlide(ctx, slide, index, index * width, width, height, 1, forceSolid));
      const blob = await canvasToBlob(canvas);
      if (!blob) throw new Error("No se pudo generar el archivo. Reduce el tamaño o el número de slides.");
      downloadBlob(blob, `carousel-${Date.now()}.${getChecked("format") === "jpeg" ? "jpg" : "png"}`);
      setStatus(`Tira horizontal lista · ${formatBytes(blob.size)}`);
      warnJpegTransparency();
    });
  }

  async function exportIndividualSlides() {
    await runExport(async () => {
      const { width, height } = getSize();
      const extension = getChecked("format") === "jpeg" ? "jpg" : "png";
      const digits = Math.max(2, String(state.slides.length).length);
      let totalBytes = 0;
      for (let index = 0; index < state.slides.length; index += 1) {
        const canvas = createCanvas(width, height);
        composeSlide(canvas.getContext("2d"), state.slides[index], index, 0, width, height, 1, extension === "jpg");
        const blob = await canvasToBlob(canvas);
        if (!blob) throw new Error(`No se pudo generar el slide ${index + 1}.`);
        totalBytes += blob.size;
        downloadBlob(blob, `slide-${String(index + 1).padStart(digits, "0")}.${extension}`);
        setStatus(`Descargando slide ${index + 1} de ${state.slides.length}…`);
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
      setStatus(`${state.slides.length} slides listos · ${formatBytes(totalBytes)}`);
      warnJpegTransparency();
    });
  }

  function escapeHtml(value) {
    const node = document.createElement("span");
    node.textContent = value;
    return node.innerHTML;
  }

  function setStatus(message, isError = false) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.style.color = isError ? "#ff9a83" : "";
  }

  function bindRange(id, suffix) {
    const input = elements[id];
    const output = elements[`${id}Value`];
    input.addEventListener("input", () => { output.textContent = `${input.value}${suffix}`; renderPreview(); });
  }

  elements.addButton.onclick = () => elements.fileInput.click();
  elements.dropZone.onclick = () => elements.fileInput.click();
  elements.dropZone.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") elements.fileInput.click(); };
  elements.fileInput.onchange = () => { addFiles(elements.fileInput.files); elements.fileInput.value = ""; };
  ["dragenter", "dragover"].forEach((type) => elements.dropZone.addEventListener(type, (event) => { event.preventDefault(); elements.dropZone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((type) => elements.dropZone.addEventListener(type, (event) => { event.preventDefault(); elements.dropZone.classList.remove("dragging"); }));
  elements.dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
  elements.logoButton.onclick = () => elements.logoInput.click();
  elements.logoInput.onchange = () => loadLogo(elements.logoInput.files[0]);
  elements.removeLogo.onclick = removeLogo;
  elements.logoScope.onchange = () => { elements.logoRangeWrap.hidden = elements.logoScope.value !== "range"; renderPreview(); };
  elements.numberBackground.onchange = () => { elements.numberBackgroundOptions.hidden = !elements.numberBackground.checked; renderPreview(); };
  elements.sizeSelect.onchange = () => { elements.customSize.hidden = elements.sizeSelect.value !== "custom"; render(); };
  [elements.customWidth, elements.customHeight].forEach((input) => input.addEventListener("input", render));
  document.querySelectorAll('input[name="fit"]').forEach((input) => input.addEventListener("change", render));
  document.querySelectorAll('input[name="background"]').forEach((input) => input.addEventListener("change", () => { render(); warnJpegTransparency(); }));
  document.querySelectorAll('input[name="format"]').forEach((input) => input.addEventListener("change", () => { elements.qualityControl.hidden = getChecked("format") !== "jpeg"; renderSummary(); warnJpegTransparency(); }));
  elements.quality.oninput = () => { elements.qualityValue.textContent = `${elements.quality.value}%`; renderSummary(); };
  ["logoEnabled", "logoPosition", "logoRange", "logoKeepRatio", "numberEnabled", "numberFormat", "numberPosition", "numberColor", "numberBackgroundColor"].forEach((id) => elements[id].addEventListener("input", renderPreview));
  [["logoSize", "%"], ["logoMargin", " px"], ["logoOpacity", "%"], ["numberSize", " px"], ["numberOpacity", "%"], ["numberMargin", " px"], ["numberBackgroundOpacity", "%"], ["numberPadding", " px"], ["numberRadius", " px"]].forEach(([id, suffix]) => bindRange(id, suffix));
  elements.exportButton.onclick = exportCarousel;
  elements.exportSlidesButton.onclick = exportIndividualSlides;
  window.addEventListener("beforeunload", () => { state.slides.forEach((slide) => URL.revokeObjectURL(slide.url)); if (state.logo) URL.revokeObjectURL(state.logo.url); });

  render();
})();
