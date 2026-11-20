const STORAGE_KEY = "unicaribe_dispensador_demo01_v1";

const DEFAULT_STATE = {
  cuenta: "demo01",
  reloj: {
    fecha: "2026-11-29",
    hora: "07:59"
  },
  medicamentos: [
    { id: 1, codigo: "M01", nombre: "Medicamento Alfa", existencias: 12, minimo: 3 },
    { id: 2, codigo: "M02", nombre: "Medicamento Beta", existencias: 4, minimo: 3 },
    { id: 3, codigo: "M03", nombre: "Medicamento Gamma", existencias: 8, minimo: 2 }
  ],
  horarios: [
    { id: 1, id_medicamento: 1, hora: "08:00", unidades: 1, activo: true },
    { id: 2, id_medicamento: 2, hora: "13:00", unidades: 1, activo: true },
    { id: 3, id_medicamento: 3, hora: "20:00", unidades: 2, activo: true }
  ],
  historial: []
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
    return JSON.parse(raw);
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(message, type = "success") {
  const el = document.getElementById("toast-banner");
  el.textContent = message;
  el.className = `toast-banner toast-${type}`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 5500);
}

function formatDateDMY(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function switchView(viewName) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.toggle("active", sec.id === `view-${viewName}`);
  });
  renderAll();
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

// ==========================================
// MEDICAMENTOS (CRUD con validaciones)
// ==========================================
document.getElementById("med-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const editId = document.getElementById("med-edit-id").value;
  const codigo = document.getElementById("med-codigo").value.trim().toUpperCase();
  const nombre = document.getElementById("med-nombre").value.trim();
  const existRaw = document.getElementById("med-existencias").value;
  const minRaw = document.getElementById("med-minimo").value;

  if (!codigo || !nombre) {
    showToast("Error: El código y el nombre del medicamento son obligatorios.", "error");
    return;
  }

  const existencias = Number(existRaw);
  const minimo = Number(minRaw);

  if (existRaw === "" || minRaw === "" || !Number.isInteger(existencias) || !Number.isInteger(minimo) || existencias < 0 || minimo < 0) {
    showToast("Error: Existencias y mínimo deben ser números enteros mayores o iguales a cero.", "error");
    return;
  }

  const duplicateCode = state.medicamentos.some(
    m => m.codigo.toUpperCase() === codigo && String(m.id) !== String(editId)
  );
  if (duplicateCode) {
    showToast(`Bloqueado: Ya existe un medicamento registrado con el código ${codigo}.`, "error");
    return;
  }

  if (editId) {
    const med = state.medicamentos.find(m => String(m.id) === String(editId));
    if (med) {
      med.codigo = codigo;
      med.nombre = nombre;
      med.existencias = existencias;
      med.minimo = minimo;
      showToast(`Medicamento ${codigo} (${nombre}) actualizado correctamente.`);
    }
  } else {
    const nextId = state.medicamentos.length ? Math.max(...state.medicamentos.map(m => m.id)) + 1 : 1;
    state.medicamentos.push({ id: nextId, codigo, nombre, existencias, minimo });
    showToast(`Medicamento ${codigo} (${nombre}) registrado en el inventario.`);
  }

  resetMedForm();
  saveState();
  renderAll();
});

function editMed(id) {
  const med = state.medicamentos.find(m => m.id === id);
  if (!med) return;
  document.getElementById("med-edit-id").value = med.id;
  document.getElementById("med-codigo").value = med.codigo;
  document.getElementById("med-nombre").value = med.nombre;
  document.getElementById("med-existencias").value = med.existencias;
  document.getElementById("med-minimo").value = med.minimo;
  document.getElementById("btn-save-med").textContent = "Actualizar medicamento";
  document.getElementById("btn-cancel-med").classList.remove("hidden");
}

function resetMedForm() {
  document.getElementById("med-form").reset();
  document.getElementById("med-edit-id").value = "";
  document.getElementById("btn-save-med").textContent = "Guardar medicamento";
  document.getElementById("btn-cancel-med").classList.add("hidden");
}

// ==========================================
// HORARIOS
// ==========================================
document.getElementById("sched-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const idMed = Number(document.getElementById("sched-med").value);
  const hora = document.getElementById("sched-hora").value;
  const unidRaw = document.getElementById("sched-unidades").value;
  const unidades = Number(unidRaw);

  if (!idMed || !hora) {
    showToast("Error: Selecciona un medicamento y una hora válida (HH:MM).", "error");
    return;
  }

  if (unidRaw === "" || !Number.isInteger(unidades) || unidades <= 0) {
    showToast("Error: Las unidades a dispensar deben ser un número entero positivo (> 0).", "error");
    return;
  }

  const dup = state.horarios.some(h => h.id_medicamento === idMed && h.hora === hora);
  if (dup) {
    const med = state.medicamentos.find(m => m.id === idMed);
    showToast(`Bloqueado: ${med ? med.nombre : "Este medicamento"} ya tiene un horario programado a las ${hora}.`, "error");
    return;
  }

  const nextId = state.horarios.length ? Math.max(...state.horarios.map(h => h.id)) + 1 : 1;
  state.horarios.push({ id: nextId, id_medicamento: idMed, hora, unidades, activo: true });
  this.reset();
  saveState();
  renderAll();
  showToast(`Horario diario guardado para las ${hora} (${unidades} ud.).`);
});

function toggleSchedule(id) {
  const h = state.horarios.find(item => item.id === id);
  if (!h) return;
  h.activo = !h.activo;
  saveState();
  renderAll();
  showToast(`Horario de las ${h.hora} marcado como ${h.activo ? "Activo" : "Inactivo"}.`, "warn");
}

// ==========================================
// SIMULADOR Y RELOJ
// ==========================================
document.getElementById("clock-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const fecha = document.getElementById("sim-fecha").value;
  const hora = document.getElementById("sim-hora").value;
  if (!fecha || !hora) {
    showToast("Error: Ingresa una fecha y hora simuladas válidas.", "error");
    return;
  }
  state.reloj.fecha = fecha;
  state.reloj.hora = hora;
  saveState();
  renderAll();
  showToast(`Reloj simulado actualizado a ${formatDateDMY(fecha)} ${hora}.`);
});

function quickSetClock(fecha, hora) {
  state.reloj.fecha = fecha;
  state.reloj.hora = hora;
  saveState();
  renderAll();
  showToast(`Reloj adelantado a ${formatDateDMY(fecha)} ${hora}.`);
}

function isAlreadyProcessed(idHorario, fecha) {
  return state.historial.some(ev => ev.id_horario === idHorario && ev.fecha === fecha);
}

function simulateDelivery(idHorario) {
  const h = state.horarios.find(item => item.id === idHorario);
  if (!h) return;
  const med = state.medicamentos.find(m => m.id === h.id_medicamento);
  if (!med) return;

  if (isAlreadyProcessed(h.id, state.reloj.fecha)) {
    showToast(`Bloqueado: El evento de ${med.nombre} (${h.hora}) ya fue procesado para la fecha ${formatDateDMY(state.reloj.fecha)}.`, "warn");
    return;
  }

  if (med.existencias < h.unidades) {
    state.historial.unshift({
      id: Date.now(),
      id_horario: h.id,
      fecha: state.reloj.fecha,
      hora: h.hora,
      medicamento: `${med.codigo} - ${med.nombre}`,
      unidades: h.unidades,
      resultado: "FALLIDA",
      motivo: `Stock insuficiente (disponible: ${med.existencias}, requerido: ${h.unidades}).`
    });
    saveState();
    renderAll();
    showToast(`Entrega FALLIDA por stock insuficiente en ${med.nombre}. Evento registrado en historial.`, "error");
    return;
  }

  med.existencias -= h.unidades;
  state.historial.unshift({
    id: Date.now(),
    id_horario: h.id,
    fecha: state.reloj.fecha,
    hora: h.hora,
    medicamento: `${med.codigo} - ${med.nombre}`,
    unidades: h.unidades,
    resultado: "COMPLETADA",
    motivo: `Dispensación exitosa. Existencias restantes: ${med.existencias}.`
  });

  saveState();
  renderAll();

  if (med.existencias <= med.minimo) {
    showToast(`Entrega COMPLETADA de ${med.nombre}. ¡ALERTA: Existencias (${med.existencias}) alcanzaron el mínimo (${med.minimo})!`, "warn");
  } else {
    showToast(`Entrega COMPLETADA: ${h.unidades} ud. de ${med.nombre}. Inventario actual: ${med.existencias}.`);
  }
}

function simulateFailure(idHorario) {
  const h = state.horarios.find(item => item.id === idHorario);
  if (!h) return;
  const med = state.medicamentos.find(m => m.id === h.id_medicamento);
  if (!med) return;

  if (isAlreadyProcessed(h.id, state.reloj.fecha)) {
    showToast(`Bloqueado: Este evento ya fue procesado para el ${formatDateDMY(state.reloj.fecha)}.`, "warn");
    return;
  }

  state.historial.unshift({
    id: Date.now(),
    id_horario: h.id,
    fecha: state.reloj.fecha,
    hora: h.hora,
    medicamento: `${med.codigo} - ${med.nombre}`,
    unidades: h.unidades,
    resultado: "FALLIDA",
    motivo: "Fallo simulado de dispensación (inventario conservado sin cambios)."
  });

  saveState();
  renderAll();
  showToast(`Fallo simulado registrado para ${med.nombre}. Se conservan sus ${med.existencias} unidades.`, "warn");
}

function resetDemoData() {
  const ok = confirm("¿Confirmas que deseas restablecer el inventario, los horarios y el historial a los valores iniciales de demostración?");
  if (!ok) return;
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveState();
  renderAll();
  showToast("Datos de ejemplo restablecidos correctamente.");
}

// ==========================================
// RENDERIZADO DE INTERFAZ
// ==========================================
function renderAll() {
  // KPIs
  document.getElementById("kpi-meds").textContent = state.medicamentos.length;
  const activeSchedules = state.horarios.filter(h => h.activo);
  document.getElementById("kpi-schedules").textContent = activeSchedules.length;
  document.getElementById("kpi-events").textContent = state.historial.length;
  document.getElementById("kpi-clock").textContent = `${formatDateDMY(state.reloj.fecha)} ${state.reloj.hora}`;

  // Alertas en Inicio
  const alertsContainer = document.getElementById("alerts-container");
  const lowMeds = state.medicamentos.filter(m => m.existencias <= m.minimo);
  if (lowMeds.length === 0) {
    alertsContainer.innerHTML = `<div class="alert-box alert-ok">Todos los medicamentos superan su umbral mínimo de inventario.</div>`;
  } else {
    alertsContainer.innerHTML = lowMeds.map(m =>
      `<div class="alert-box alert-warn"><strong>Alerta de stock mínimo:</strong> ${m.codigo} - ${m.nombre} tiene <strong>${m.existencias} unidades</strong> (mínimo configurado: ${m.minimo}).</div>`
    ).join("");
  }

  // Tabla resumen en Inicio
  const inicioBody = document.getElementById("inicio-schedules-body");
  const sortedActive = [...activeSchedules].sort((a, b) => a.hora.localeCompare(b.hora));
  inicioBody.innerHTML = sortedActive.map(h => {
    const med = state.medicamentos.find(m => m.id === h.id_medicamento);
    return `<tr>
      <td><strong>${h.hora}</strong></td>
      <td>${med ? med.codigo : "-"}</td>
      <td>${med ? med.nombre : "-"}</td>
      <td>${h.unidades} ud.</td>
      <td>${med ? med.existencias : 0} ud.</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5">No hay horarios activos registrados.</td></tr>`;

  // Tabla Medicamentos
  const medsBody = document.getElementById("meds-table-body");
  medsBody.innerHTML = state.medicamentos.map(m => {
    const isLow = m.existencias <= m.minimo;
    const badge = isLow
      ? `<span class="badge badge-warn">Stock bajo (≤ ${m.minimo})</span>`
      : `<span class="badge badge-ok">Disponible</span>`;
    return `<tr>
      <td><strong>${m.codigo}</strong></td>
      <td>${m.nombre}</td>
      <td>${m.existencias}</td>
      <td>${m.minimo}</td>
      <td>${badge}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="editMed(${m.id})">Editar</button></td>
    </tr>`;
  }).join("");

  // Select de Medicamentos en Horarios
  const schedSelect = document.getElementById("sched-med");
  schedSelect.innerHTML = state.medicamentos.map(m =>
    `<option value="${m.id}">${m.codigo} - ${m.nombre}</option>`
  ).join("");

  // Tabla Horarios
  const schedsBody = document.getElementById("scheds-table-body");
  const sortedAllScheds = [...state.horarios].sort((a, b) => a.hora.localeCompare(b.hora));
  schedsBody.innerHTML = sortedAllScheds.map(h => {
    const med = state.medicamentos.find(m => m.id === h.id_medicamento);
    const statusBadge = h.activo
      ? `<span class="badge badge-ok">Activo</span>`
      : `<span class="badge badge-muted">Inactivo</span>`;
    return `<tr>
      <td>${med ? `${med.codigo} - ${med.nombre}` : "Desconocido"}</td>
      <td><strong>${h.hora}</strong></td>
      <td>${h.unidades}</td>
      <td>${statusBadge}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="toggleSchedule(${h.id})">${h.activo ? "Desactivar" : "Activar"}</button></td>
    </tr>`;
  }).join("");

  // Simulador
  document.getElementById("sim-fecha").value = state.reloj.fecha;
  document.getElementById("sim-hora").value = state.reloj.hora;
  document.getElementById("sim-clock-label").textContent = `${formatDateDMY(state.reloj.fecha)} ${state.reloj.hora}`;

  const simContainer = document.getElementById("sim-events-container");
  const dueEvents = sortedActive.filter(h => h.hora <= state.reloj.hora);
  if (dueEvents.length === 0) {
    simContainer.innerHTML = `<div class="info-callout">No hay horarios activos vencidos para las <strong>${state.reloj.hora}</strong>. Adelanta el reloj a <strong>08:00</strong>, <strong>13:00</strong> o <strong>20:00</strong> y pulsa <em>Actualizar reloj</em>.</div>`;
  } else {
    simContainer.innerHTML = dueEvents.map(h => {
      const med = state.medicamentos.find(m => m.id === h.id_medicamento);
      const processedRecord = state.historial.find(ev => ev.id_horario === h.id && ev.fecha === state.reloj.fecha);
      if (processedRecord) {
        const badgeCls = processedRecord.resultado === "COMPLETADA" ? "badge-ok" : "badge-fail";
        return `<div class="sim-event-card processed">
          <div>
            <strong>${h.hora} · ${med ? `${med.codigo} - ${med.nombre}` : ""}</strong> (${h.unidades} ud.)
            <div style="font-size:0.86rem; color:#475569; margin-top:4px;">
              Procesado el ${formatDateDMY(state.reloj.fecha)} · Estado: <span class="badge ${badgeCls}">${processedRecord.resultado}</span> (Bloqueado contra duplicados)
            </div>
          </div>
          <div class="sim-actions">
            <button class="btn btn-secondary btn-sm" disabled>Evento procesado</button>
          </div>
        </div>`;
      }
      return `<div class="sim-event-card">
        <div>
          <strong>${h.hora} · ${med ? `${med.codigo} - ${med.nombre}` : ""}</strong> — Dosis: <strong>${h.unidades} ud.</strong>
          <div style="font-size:0.86rem; color:#475569; margin-top:4px;">
            Existencias actuales: <strong>${med ? med.existencias : 0} ud.</strong> (Mínimo: ${med ? med.minimo : 0})
          </div>
        </div>
        <div class="sim-actions">
          <button class="btn btn-primary btn-sm" onclick="simulateDelivery(${h.id})">Simular entrega</button>
          <button class="btn btn-danger btn-sm" onclick="simulateFailure(${h.id})">Simular fallo</button>
        </div>
      </div>`;
    }).join("");
  }

  // Tabla Historial
  const histBody = document.getElementById("history-table-body");
  if (state.historial.length === 0) {
    histBody.innerHTML = `<tr><td colspan="6">El historial está vacío. <a href="#" onclick="switchView('simulador'); return false;">Ejecutar una simulación</a>.</td></tr>`;
  } else {
    histBody.innerHTML = state.historial.map(ev => {
      const badgeCls = ev.resultado === "COMPLETADA" ? "badge-ok" : "badge-fail";
      return `<tr>
        <td>${formatDateDMY(ev.fecha)}</td>
        <td><strong>${ev.hora}</strong></td>
        <td>${ev.medicamento}</td>
        <td>${ev.unidades}</td>
        <td><span class="badge ${badgeCls}">${ev.resultado}</span></td>
        <td>${ev.motivo}</td>
      </tr>`;
    }).join("");
  }
}

renderAll();
