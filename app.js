// Carousel Assembler: all image processing stays inside the browser.
(() => {
  "use strict";

  const state = { slides: [], draggedId: null, logo: null };
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    fileInput: $("#fileInput"), addButton: $("#addButton"), dropZone: $("#dropZone"),
    slideList: $("#slideList"), emptyHint: $("#emptyHint"), sizeSelect: $("#sizeSelect"),
    customSize: $("#customSize"), customWidth: $("#customWidth"), customHeight: $("#customHeight"),
    qualityControl: $("#qualityControl"), quality: $("#quality"), qualityValue: $("#qualityValue"),
    previewEmpty: $("#previewEmpty"), previewStrip: $("#previewStrip"),
    summarySlides: $("#summarySlides"), summarySlideSize: $("#summarySlideSize"),
    summaryFinalSize: $("#summaryFinalSize"), summaryFormat: $("#summaryFormat"),
    mobileWarning: $("#mobileWarning"), exportButton: $("#exportButton"),
    exportSlidesButton: $("#exportSlidesButton"), status: $("#statusMessage"),
    logoInput: $("#logoInput"), logoEnabled: $("#logoEnabled"), removeLogo: $("#removeLogo"),
    logoPreviewWrap: $("#logoPreviewWrap"), logoPreview: $("#logoPreview"), logoFileName: $("#logoFileName"),
    logoScope: $("#logoScope"), logoRangeWrap: $("#logoRangeWrap"), logoRange: $("#logoRange"),
    logoPosition: $("#logoPosition"), logoSize: $("#logoSize"), logoSizeValue: $("#logoSizeValue"),
    logoMargin: $("#logoMargin"), logoMarginValue: $("#logoMarginValue"),
    logoOpacity: $("#logoOpacity"), logoOpacityValue: $("#logoOpacityValue"),
    numberEnabled: $("#numberEnabled"), numberFormat: $("#numberFormat"), numberPosition: $("#numberPosition"),
    numberSize: $("#numberSize"), numberSizeValue: $("#numberSizeValue"), numberColor: $("#numberColor"),
    numberOpacity: $("#numberOpacity"), numberOpacityValue: $("#numberOpacityValue"),
    numberMargin: $("#numberMargin"), numberMarginValue: $("#numberMarginValue"),
    numberBackground: $("#numberBackground"), numberBackgroundOptions: $("#numberBackgroundOptions"),
    numberBackgroundColor: $("#numberBackgroundColor"), numberBackgroundOpacity: $("#numberBackgroundOpacity"),
    numberBackgroundOpacityValue: $("#numberBackgroundOpacityValue"), numberPadding: $("#numberPadding"),
    numberPaddingValue: $("#numberPaddingValue"), numberRadius: $("#numberRadius"), numberRadiusValue: $("#numberRadiusValue")
  };

  const getChecked = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

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

  function loadImageFile(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => resolve({ file, url, image });
      image.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      image.src = url;
    });
  }

  async function addFiles(files) {
    const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return setStatus("Selecciona archivos de imagen válidos.", true);
    const loaded = await Promise.all(imageFiles.map(loadImageFile));
    state.slides.push(...loaded.filter(Boolean).map((slide) => ({ ...slide, id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}` })));
    setStatus(`${loaded.filter(Boolean).length} imagen(es) añadida(s).`);
    render();
  }

  async function loadLogo(file) {
    const isSupported = file && (file.type === "image/png" || file.type === "image/svg+xml" || /\.(png|svg)$/i.test(file.name));
    if (!isSupported) return setStatus("El logo debe ser un archivo PNG o SVG.", true);
    const loaded = await loadImageFile(file);
    if (!loaded) return setStatus("No se pudo leer el logo.", true);
    removeLogo();
    state.logo = loaded;
    elements.logoPreview.src = loaded.url;
    elements.logoFileName.textContent = file.name;
    elements.logoPreviewWrap.hidden = false;
    elements.logoEnabled.disabled = false;
    elements.logoEnabled.checked = true;
    elements.removeLogo.disabled = false;
    setStatus("Logo añadido.");
    renderPreview();
  }

  function removeLogo() {
    if (state.logo) URL.revokeObjectURL(state.logo.url);
    state.logo = null;
    elements.logoInput.value = "";
    elements.logoEnabled.checked = false;
    elements.logoEnabled.disabled = true;
    elements.removeLogo.disabled = true;
    elements.logoPreviewWrap.hidden = true;
    elements.logoPreview.removeAttribute("src");
    elements.logoFileName.textContent = "";
    renderPreview();
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
      card.dataset.id = slide.id;
      card.innerHTML = `
        <span class="drag-handle" title="Arrastrar para ordenar" aria-hidden="true">⠿</span>
        <img class="thumb" src="${slide.url}" alt="Miniatura del slide ${index + 1}" />
        <div class="slide-info"><strong>${index + 1}. ${escapeHtml(slide.file.name)}</strong><small>${slide.image.naturalWidth} × ${slide.image.naturalHeight} · ${formatBytes(slide.file.size)}</small></div>
        <div class="move-actions" aria-label="Mover slide ${index + 1}">
          <button class="icon-button move-left" type="button" aria-label="Mover slide ${index + 1} a la izquierda" ${index === 0 ? "disabled" : ""}>←</button>
          <button class="icon-button move-right" type="button" aria-label="Mover slide ${index + 1} a la derecha" ${index === state.slides.length - 1 ? "disabled" : ""}>→</button>
        </div>
        <button class="icon-button delete-button" type="button" aria-label="Eliminar slide ${index + 1}">×</button>`;
      card.querySelector(".move-left").addEventListener("click", () => moveSlide(slide.id, -1));
      card.querySelector(".move-right").addEventListener("click", () => moveSlide(slide.id, 1));
      card.querySelector(".delete-button").addEventListener("click", () => deleteSlide(slide.id));
      card.addEventListener("dragstart", () => { state.draggedId = slide.id; card.classList.add("dragging"); });
      card.addEventListener("dragend", () => { state.draggedId = null; card.classList.remove("dragging"); });
      card.addEventListener("dragover", (event) => event.preventDefault());
      card.addEventListener("drop", (event) => {
        event.preventDefault();
        if (!state.draggedId || state.draggedId === slide.id) return;
        const from = state.slides.findIndex((item) => item.id === state.draggedId);
        const to = state.slides.findIndex((item) => item.id === slide.id);
        const [moved] = state.slides.splice(from, 1);
        state.slides.splice(to, 0, moved);
        render();
      });
      elements.slideList.append(card);
    });
  }

  function shouldDrawLogo(index) {
    if (!state.logo || !elements.logoEnabled.checked) return false;
    const slideNumber = index + 1;
    if (elements.logoScope.value === "first") return index === 0;
    if (elements.logoScope.value === "last") return index === state.slides.length - 1;
    if (elements.logoScope.value === "except-first") return index > 0;
    if (elements.logoScope.value === "custom") {
      const match = elements.logoRange.value.trim().match(/^(\d+)\s*-\s*(\d+)$/);
      if (!match) return false;
      const start = Math.min(Number(match[1]), Number(match[2]));
      const end = Math.max(Number(match[1]), Number(match[2]));
      return slideNumber >= start && slideNumber <= end;
    }
    return true;
  }

  function getAnchoredPosition(position, itemWidth, itemHeight, width, height, margin) {
    const horizontal = position.endsWith("left") ? margin : position.endsWith("right") ? width - margin - itemWidth : (width - itemWidth) / 2;
    const vertical = position.startsWith("top") ? margin : height - margin - itemHeight;
    return { x: horizontal, y: vertical };
  }

  function drawLogo(ctx, index, width, height) {
    if (!shouldDrawLogo(index)) return;
    const logoWidth = width * Number(elements.logoSize.value) / 100;
    const logoHeight = logoWidth * state.logo.image.naturalHeight / state.logo.image.naturalWidth;
    const margin = width * Number(elements.logoMargin.value) / 100;
    const { x, y } = getAnchoredPosition(elements.logoPosition.value, logoWidth, logoHeight, width, height, margin);
    ctx.save();
    ctx.globalAlpha = Number(elements.logoOpacity.value) / 100;
    ctx.drawImage(state.logo.image, x, y, logoWidth, logoHeight);
    ctx.restore();
  }

  function numberText(index) {
    const current = index + 1;
    const total = state.slides.length;
    const digits = Math.max(2, String(total).length);
    const padded = String(current).padStart(digits, "0");
    if (elements.numberFormat.value === "fraction") return `${current}/${total}`;
    if (elements.numberFormat.value === "padded") return padded;
    if (elements.numberFormat.value === "padded-fraction") return `${padded}/${String(total).padStart(digits, "0")}`;
    return String(current);
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, safeRadius);
    ctx.fill();
  }

  function drawNumber(ctx, index, width, height) {
    if (!elements.numberEnabled.checked) return;
    const fontSize = Math.max(8, width * Number(elements.numberSize.value) / 100);
    const margin = width * Number(elements.numberMargin.value) / 100;
    const padding = width * Number(elements.numberPadding.value) / 100;
    const text = numberText(index);
    ctx.save();
    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = "top";
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.15;
    const boxPadding = elements.numberBackground.checked ? padding : 0;
    const boxWidth = textWidth + boxPadding * 2;
    const boxHeight = textHeight + boxPadding * 2;
    const { x, y } = getAnchoredPosition(elements.numberPosition.value, boxWidth, boxHeight, width, height, margin);
    if (elements.numberBackground.checked) {
      ctx.globalAlpha = Number(elements.numberBackgroundOpacity.value) / 100;
      ctx.fillStyle = elements.numberBackgroundColor.value;
      drawRoundedRect(ctx, x, y, boxWidth, boxHeight, width * Number(elements.numberRadius.value) / 100);
    }
    ctx.globalAlpha = Number(elements.numberOpacity.value) / 100;
    ctx.fillStyle = elements.numberColor.value;
    ctx.fillText(text, x + boxPadding, y + boxPadding);
    ctx.restore();
  }

  function drawSlide(ctx, slide, index, width, height, outputFormat = getChecked("format")) {
    const background = getChecked("background");
    ctx.clearRect(0, 0, width, height);
    if (background !== "transparent" || outputFormat === "jpeg") {
      ctx.fillStyle = background === "transparent" ? "#ffffff" : background;
      ctx.fillRect(0, 0, width, height);
    }
    const image = slide.image;
    const scale = getChecked("fit") === "cover" ? Math.max(width / image.naturalWidth, height / image.naturalHeight) : Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    drawLogo(ctx, index, width, height);
    drawNumber(ctx, index, width, height);
  }

  function renderPreview() {
    const { width, height } = getSize();
    const previewHeight = Math.round(Math.min(260, Math.max(190, height / width * 180)));
    const previewWidth = Math.round(previewHeight * width / height);
    elements.previewStrip.replaceChildren();
    state.slides.forEach((slide, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "preview-slide";
      wrapper.style.width = `${previewWidth}px`;
      wrapper.style.height = `${previewHeight}px`;
      const canvas = document.createElement("canvas");
      canvas.width = previewWidth;
      canvas.height = previewHeight;
      canvas.setAttribute("aria-label", `Vista previa del slide ${index + 1}`);
      drawSlide(canvas.getContext("2d"), slide, index, previewWidth, previewHeight);
      wrapper.append(canvas);
      elements.previewStrip.append(wrapper);
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
    elements.exportButton.disabled = state.slides.length === 0;
    elements.exportSlidesButton.disabled = state.slides.length === 0;
  }

  function render() {
    renderSlides();
    renderPreview();
    renderSummary();
    elements.emptyHint.hidden = state.slides.length > 0;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function exportCarousel() {
    const { width, height } = getSize();
    const totalWidth = width * state.slides.length;
    const format = getChecked("format");
    setExportDisabled(true);
    setStatus("Preparando la imagen…");
    await nextFrame();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = totalWidth;
      canvas.height = height;
      if (canvas.width !== totalWidth || canvas.height !== height) throw new Error("El navegador no admite un lienzo de este tamaño.");
      const context = canvas.getContext("2d");
      state.slides.forEach((slide, index) => {
        context.save();
        context.translate(index * width, 0);
        drawSlide(context, slide, index, width, height);
        context.restore();
      });
      const blob = await canvasToBlob(canvas, `image/${format}`, Number(elements.quality.value) / 100);
      if (!blob) throw new Error("No se pudo generar el archivo. Prueba con menos slides o un tamaño menor.");
      downloadBlob(blob, `carousel-${Date.now()}.${format === "jpeg" ? "jpg" : "png"}`);
      setStatus(`Exportación lista · ${formatBytes(blob.size)}`);
    } catch (error) {
      setStatus(error.message || "No se pudo exportar el carrusel.", true);
    } finally {
      setExportDisabled(false);
    }
  }

  async function exportIndividualSlides() {
    const { width, height } = getSize();
    setExportDisabled(true);
    setStatus("Preparando slides individuales…");
    await nextFrame();
    try {
      const digits = Math.max(2, String(state.slides.length).length);
      for (let index = 0; index < state.slides.length; index += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        drawSlide(canvas.getContext("2d"), state.slides[index], index, width, height, "png");
        const blob = await canvasToBlob(canvas, "image/png");
        if (!blob) throw new Error(`No se pudo generar el slide ${index + 1}.`);
        downloadBlob(blob, `slide-${String(index + 1).padStart(digits, "0")}.png`);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      setStatus(`${state.slides.length} slide(s) exportado(s) en PNG.`);
    } catch (error) {
      setStatus(error.message || "No se pudieron exportar los slides.", true);
    } finally {
      setExportDisabled(false);
    }
  }

  function setExportDisabled(disabled) {
    elements.exportButton.disabled = disabled || state.slides.length === 0;
    elements.exportSlidesButton.disabled = disabled || state.slides.length === 0;
  }

  function escapeHtml(value) {
    const node = document.createElement("span");
    node.textContent = value;
    return node.innerHTML;
  }

  function setStatus(message, isError = false) {
    elements.status.textContent = message;
    elements.status.style.color = isError ? "#ff9a83" : "";
  }

  function bindRange(input, output) {
    input.addEventListener("input", () => { output.textContent = `${input.value}%`; renderPreview(); });
  }

  elements.addButton.addEventListener("click", () => elements.fileInput.click());
  elements.dropZone.addEventListener("click", () => elements.fileInput.click());
  elements.dropZone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") elements.fileInput.click(); });
  elements.fileInput.addEventListener("change", () => { addFiles(elements.fileInput.files); elements.fileInput.value = ""; });
  ["dragenter", "dragover"].forEach((type) => elements.dropZone.addEventListener(type, (event) => { event.preventDefault(); elements.dropZone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((type) => elements.dropZone.addEventListener(type, (event) => { event.preventDefault(); elements.dropZone.classList.remove("dragging"); }));
  elements.dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
  elements.sizeSelect.addEventListener("change", () => { elements.customSize.hidden = elements.sizeSelect.value !== "custom"; render(); });
  [elements.customWidth, elements.customHeight].forEach((input) => input.addEventListener("input", render));
  document.querySelectorAll('input[name="fit"], input[name="background"]').forEach((input) => input.addEventListener("change", render));
  document.querySelectorAll('input[name="format"]').forEach((input) => input.addEventListener("change", () => { elements.qualityControl.hidden = getChecked("format") !== "jpeg"; render(); }));
  elements.quality.addEventListener("input", () => { elements.qualityValue.textContent = `${elements.quality.value}%`; renderSummary(); });
  elements.logoInput.addEventListener("change", () => loadLogo(elements.logoInput.files[0]));
  elements.removeLogo.addEventListener("click", () => { removeLogo(); setStatus("Logo eliminado."); });
  elements.logoScope.addEventListener("change", () => { elements.logoRangeWrap.hidden = elements.logoScope.value !== "custom"; renderPreview(); });
  [elements.logoEnabled, elements.numberEnabled, elements.numberBackground].forEach((input) => input.addEventListener("change", () => {
    elements.numberBackgroundOptions.hidden = !elements.numberBackground.checked;
    renderPreview();
  }));
  [elements.logoRange, elements.logoPosition, elements.numberFormat, elements.numberPosition, elements.numberColor,
    elements.numberBackgroundColor].forEach((input) => input.addEventListener("input", renderPreview));
  bindRange(elements.logoSize, elements.logoSizeValue);
  bindRange(elements.logoMargin, elements.logoMarginValue);
  bindRange(elements.logoOpacity, elements.logoOpacityValue);
  bindRange(elements.numberSize, elements.numberSizeValue);
  bindRange(elements.numberOpacity, elements.numberOpacityValue);
  bindRange(elements.numberMargin, elements.numberMarginValue);
  bindRange(elements.numberBackgroundOpacity, elements.numberBackgroundOpacityValue);
  bindRange(elements.numberPadding, elements.numberPaddingValue);
  bindRange(elements.numberRadius, elements.numberRadiusValue);
  elements.exportButton.addEventListener("click", exportCarousel);
  elements.exportSlidesButton.addEventListener("click", exportIndividualSlides);
  window.addEventListener("beforeunload", () => {
    state.slides.forEach((slide) => URL.revokeObjectURL(slide.url));
    if (state.logo) URL.revokeObjectURL(state.logo.url);
  });

  render();
})();
