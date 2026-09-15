// Carousel Assembler: all image processing stays inside the browser.
(() => {
  "use strict";

  const state = { slides: [], draggedId: null };
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    fileInput: $("#fileInput"), addButton: $("#addButton"), dropZone: $("#dropZone"),
    slideList: $("#slideList"), emptyHint: $("#emptyHint"), sizeSelect: $("#sizeSelect"),
    customSize: $("#customSize"), customWidth: $("#customWidth"), customHeight: $("#customHeight"),
    qualityControl: $("#qualityControl"), quality: $("#quality"), qualityValue: $("#qualityValue"),
    previewEmpty: $("#previewEmpty"), previewStrip: $("#previewStrip"),
    summarySlides: $("#summarySlides"), summarySlideSize: $("#summarySlideSize"),
    summaryFinalSize: $("#summaryFinalSize"), summaryFormat: $("#summaryFormat"),
    mobileWarning: $("#mobileWarning"), exportButton: $("#exportButton"), status: $("#statusMessage")
  };

  const getChecked = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

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
    if (!imageFiles.length) {
      setStatus("Selecciona archivos de imagen válidos.", true);
      return;
    }
    const loaded = await Promise.all(imageFiles.map(loadFile));
    state.slides.push(...loaded.filter(Boolean));
    setStatus(`${loaded.filter(Boolean).length} imagen(es) añadida(s).`);
    render();
  }

  function loadFile(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => resolve({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, file, url, image });
      image.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      image.src = url;
    });
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

  function renderPreview() {
    const { width, height } = getSize();
    const previewHeight = Math.min(260, Math.max(190, height / width * 180));
    const previewWidth = previewHeight * width / height;
    const fit = getChecked("fit");
    const background = getChecked("background");
    elements.previewStrip.replaceChildren();
    state.slides.forEach((slide) => {
      const image = document.createElement("img");
      image.className = "preview-slide";
      image.src = slide.url;
      image.alt = "";
      image.style.width = `${previewWidth}px`;
      image.style.height = `${previewHeight}px`;
      image.style.objectFit = fit;
      image.style.background = background === "transparent" ? "transparent" : background;
      elements.previewStrip.append(image);
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
    // Raw canvas memory is roughly four bytes per pixel; warn at 64 MB or very wide canvases.
    elements.mobileWarning.hidden = finalWidth * height * 4 < 64 * 1024 * 1024 && finalWidth < 16384;
    elements.exportButton.disabled = state.slides.length === 0;
  }

  function render() { renderSlides(); renderPreview(); renderSummary(); elements.emptyHint.hidden = state.slides.length > 0; }

  function drawImage(ctx, image, x, width, height, fit) {
    const scale = fit === "cover" ? Math.max(width / image.naturalWidth, height / image.naturalHeight) : Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  async function exportCarousel() {
    const { width, height } = getSize();
    const totalWidth = width * state.slides.length;
    const format = getChecked("format");
    const background = getChecked("background");
    elements.exportButton.disabled = true;
    setStatus("Preparando la imagen…");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      const canvas = document.createElement("canvas");
      canvas.width = totalWidth;
      canvas.height = height;
      if (canvas.width !== totalWidth || canvas.height !== height) throw new Error("El navegador no admite un lienzo de este tamaño.");
      const ctx = canvas.getContext("2d");
      // JPEG has no alpha channel, so transparent areas become white.
      if (background !== "transparent" || format === "jpeg") {
        ctx.fillStyle = background === "transparent" ? "#ffffff" : background;
        ctx.fillRect(0, 0, totalWidth, height);
      }
      state.slides.forEach((slide, index) => drawImage(ctx, slide.image, index * width, width, height, getChecked("fit")));
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, Number(elements.quality.value) / 100));
      if (!blob) throw new Error("No se pudo generar el archivo. Prueba con menos slides o un tamaño menor.");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `carousel-${Date.now()}.${format === "jpeg" ? "jpg" : "png"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setStatus(`Exportación lista · ${formatBytes(blob.size)}`);
    } catch (error) {
      setStatus(error.message || "No se pudo exportar el carrusel.", true);
    } finally {
      elements.exportButton.disabled = state.slides.length === 0;
    }
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
  document.querySelectorAll('input[name="format"]').forEach((input) => input.addEventListener("change", () => { elements.qualityControl.hidden = getChecked("format") !== "jpeg"; renderSummary(); }));
  elements.quality.addEventListener("input", () => { elements.qualityValue.textContent = `${elements.quality.value}%`; renderSummary(); });
  elements.exportButton.addEventListener("click", exportCarousel);
  window.addEventListener("beforeunload", () => state.slides.forEach((slide) => URL.revokeObjectURL(slide.url)));

  render();
})();
