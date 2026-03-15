// FIREBASE CONFIG
var firebaseConfig = {
  apiKey: "AIzaSyAUEJe5j5--TVpjKWTz72hRBJAG9o_bt7k",
  authDomain: "finanzapp-6afec.firebaseapp.com",
  projectId: "finanzapp-6afec",
  storageBucket: "finanzapp-6afec.firebasestorage.app",
  messagingSenderId: "65628984681",
  appId: "1:65628984681:web:3834a535a1edfe237b59f8"
};

var firebaseApp, auth, db, usuarioActual;

function cargarFirebase(callback) {
  var s1 = document.createElement("script");
  s1.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
  s1.onload = function() {
    var s2 = document.createElement("script");
    s2.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js";
    s2.onload = function() {
      var s3 = document.createElement("script");
      s3.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js";
      s3.onload = function() {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db   = firebase.firestore();
        callback();
      };
      document.head.appendChild(s3);
    };
    document.head.appendChild(s2);
  };
  document.head.appendChild(s1);
}

// CATEGORIAS
var categorias = {
  Salario:         { icon: "💼", color: "#51CF66" },
  Freelance:       { icon: "💻", color: "#20C997" },
  Comida:          { icon: "🍔", color: "#FF6B6B" },
  Restaurante:     { icon: "🍽️", color: "#FF922B" },
  Uber:            { icon: "🚖", color: "#339AF0" },
  Combustible:     { icon: "⛽", color: "#F59F00" },
  Peajes:          { icon: "🛣️", color: "#74C0FC" },
  Mecanico:        { icon: "🔧", color: "#868E96" },
  Arriendo:        { icon: "🏠", color: "#A9E34B" },
  Agua:            { icon: "💧", color: "#4DABF7" },
  Luz:             { icon: "⚡", color: "#FFD43B" },
  Internet:        { icon: "📶", color: "#748FFC" },
  Ropa:            { icon: "👗", color: "#F783AC" },
  Belleza:         { icon: "💄", color: "#E64980" },
  Gimnasio:        { icon: "🏋️", color: "#FF8787" },
  Educacion:       { icon: "🎓", color: "#63E6BE" },
  Mascotas:        { icon: "🐾", color: "#FFA94D" },
  Regalos:         { icon: "🎁", color: "#DA77F2" },
  Salud:           { icon: "🏥", color: "#FF8CC8" },
  Entretenimiento: { icon: "🎬", color: "#CC5DE8" },
  Servicios:       { icon: "🔑", color: "#69DB7C" }
};

// VARIABLES
var transacciones         = [];
var metas                 = [];
var categoriasCustom      = [];
var categoriaSeleccionada = "Comida";
var tipoSeleccionado      = "gasto";
var editandoId            = null;
var iconoCustom           = "🌟";
var colorCustom           = "#6366F1";
var filtroActivo          = "mes";

// TOAST
function mostrarToast(msg, error) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.className   = "toast show" + (error ? " error" : "");
  setTimeout(function() { t.className = "toast"; }, 2500);
}

// LOGIN
function loginGoogle() {
  var provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(function(e) {
    mostrarToast("Error al iniciar sesion", true);
  });
}

function cerrarSesion() {
  if (!confirm("Cerrar sesion?")) return;
  auth.signOut();
}

function mostrarPerfil() {
  mostrarPantalla("config");
  setNavById(3);
}

// FIRESTORE
function cargarDatosNube() {
  var uid = usuarioActual.uid;
  db.collection("usuarios").doc(uid).collection("transacciones")
    .orderBy("timestamp", "desc").onSnapshot(function(snap) {
      transacciones = [];
      snap.forEach(function(doc) {
        var d = doc.data(); d.id = doc.id;
        transacciones.push(d);
      });
      renderLista();
      actualizarTotales();
    });
  db.collection("usuarios").doc(uid).collection("metas")
    .onSnapshot(function(snap) {
      metas = [];
      snap.forEach(function(doc) {
        var d = doc.data(); d.id = doc.id;
        metas.push(d);
      });
    });
  db.collection("usuarios").doc(uid).collection("config")
    .doc("preferencias").get().then(function(doc) {
      if (doc.exists) {
        var cfg = doc.data();
        document.getElementById("selectMoneda").value = cfg.moneda || "$";
        categoriasCustom = cfg.categoriasCustom || [];
      }
    });
}

function guardarTransaccionNube(t) {
  var uid = usuarioActual.uid;
  t.timestamp = firebase.firestore.FieldValue.serverTimestamp();
  if (t.id && typeof t.id === "string" && t.id.length > 10) {
    db.collection("usuarios").doc(uid).collection("transacciones").doc(t.id).set(t);
  } else {
    db.collection("usuarios").doc(uid).collection("transacciones").add(t);
  }
}

function eliminarTransaccionNube(id) {
  var uid = usuarioActual.uid;
  db.collection("usuarios").doc(uid).collection("transacciones").doc(id).delete();
}

function guardarMetaNube(meta) {
  var uid = usuarioActual.uid;
  if (meta.id && typeof meta.id === "string" && meta.id.length > 5) {
    db.collection("usuarios").doc(uid).collection("metas").doc(meta.id).set(meta);
  } else {
    db.collection("usuarios").doc(uid).collection("metas").add(meta);
  }
}

function eliminarMetaNube(id) {
  var uid = usuarioActual.uid;
  db.collection("usuarios").doc(uid).collection("metas").doc(id).delete();
}

function guardarConfig() {
  var uid = usuarioActual.uid;
  var cfg = {
    moneda: document.getElementById("selectMoneda").value,
    categoriasCustom: categoriasCustom
  };
  db.collection("usuarios").doc(uid).collection("config").doc("preferencias").set(cfg);
  mostrarToast("Configuracion guardada");
}

function borrarTodo() {
  if (!confirm("Borrar todas las transacciones y metas?")) return;
  var uid   = usuarioActual.uid;
  var batch = db.batch();
  for (var i = 0; i < transacciones.length; i++) {
    var ref = db.collection("usuarios").doc(uid).collection("transacciones").doc(transacciones[i].id);
    batch.delete(ref);
  }
  batch.commit().then(function() { mostrarToast("Datos borrados"); });
}
// FILTROS
function setFiltro(filtro) {
  filtroActivo = filtro;
  document.querySelectorAll(".filtro-btn").forEach(function(b) {
    b.classList.remove("activo");
  });
  document.getElementById("filtro-" + filtro).classList.add("activo");
  renderLista();
  actualizarTotales();
}

function filtrarTransacciones() {
  var hoy = new Date();
  return transacciones.filter(function(t) {
    if (!t.timestamp) return filtroActivo === "todo";
    var fecha = t.timestamp.toDate ? t.timestamp.toDate() : new Date();
    if (filtroActivo === "semana") {
      var inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - 7);
      return fecha >= inicio;
    } else if (filtroActivo === "mes") {
      return fecha.getMonth() === hoy.getMonth() &&
             fecha.getFullYear() === hoy.getFullYear();
    } else if (filtroActivo === "año") {
      return fecha.getFullYear() === hoy.getFullYear();
    }
    return true;
  });
}

function filtrarSemanaAnterior() {
  var hoy = new Date();
  var inicioEsta     = new Date(hoy); inicioEsta.setDate(hoy.getDate() - 7);
  var inicioAnterior = new Date(hoy); inicioAnterior.setDate(hoy.getDate() - 14);
  return transacciones.filter(function(t) {
    if (!t.timestamp) return false;
    var fecha = t.timestamp.toDate ? t.timestamp.toDate() : new Date();
    return fecha >= inicioAnterior && fecha < inicioEsta;
  });
}

// CATEGORIAS
function getCategorias() {
  var todas = {};
  var keys  = Object.keys(categorias);
  for (var i = 0; i < keys.length; i++) todas[keys[i]] = categorias[keys[i]];
  for (var j = 0; j < categoriasCustom.length; j++) {
    var c = categoriasCustom[j];
    todas[c.nombre] = { icon: c.icon, color: c.color };
  }
  return todas;
}

function renderCategorias() {
  var wrap = document.getElementById("categorias");
  var todas = getCategorias();
  var nombres = Object.keys(todas);
  wrap.innerHTML = "";
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i];
    var cat    = todas[nombre];
    var sel    = categoriaSeleccionada === nombre;
    wrap.innerHTML += '<div class="cat-item" onclick="seleccionarCat(\'' + nombre + '\')">' +
      '<div class="cat-icon ' + (sel ? "selected" : "") + '" style="color:' + cat.color +
      ';background:' + cat.color + '22;' + (sel ? 'border-color:' + cat.color : '') + '">' +
      cat.icon + '</div><span class="cat-nombre">' + nombre + '</span></div>';
  }
}

function renderCategoriasModal() {
  var wrap = document.getElementById("categoriasModal");
  var todas = getCategorias();
  var nombres = Object.keys(todas);
  wrap.innerHTML = "";
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i];
    var cat    = todas[nombre];
    var sel    = categoriaSeleccionada === nombre;
    wrap.innerHTML += '<div class="cat-item" onclick="seleccionarCatModal(\'' + nombre + '\')">' +
      '<div class="cat-icon ' + (sel ? "selected" : "") + '" style="color:' + cat.color +
      ';background:' + cat.color + '22;' + (sel ? 'border-color:' + cat.color : '') + '">' +
      cat.icon + '</div><span class="cat-nombre">' + nombre + '</span></div>';
  }
}

function seleccionarCat(n) { categoriaSeleccionada = n; renderCategorias(); }
function seleccionarCatModal(n) { categoriaSeleccionada = n; renderCategoriasModal(); }

// LISTA
function crearItemHTML(t) {
  var todas = getCategorias();
  var cat   = todas[t.categoria] || { icon: "💰", color: "#6366F1" };
  var signo = t.type === "ingreso" ? "+" : "-";
  var clase = t.type === "ingreso" ? "monto-ingreso" : "monto-gasto";
  return '<div class="trans-item" onclick="editarTransaccion(\'' + t.id + '\')">' +
    '<div class="trans-icon" style="background:' + cat.color + '22">' + cat.icon + '</div>' +
    '<div class="trans-info">' +
      '<p class="trans-desc">' + t.descripcion + '</p>' +
      '<p class="trans-meta">' + t.categoria + ' - ' + t.fecha + '</p>' +
    '</div>' +
    '<span class="trans-monto ' + clase + '">' + signo + '$' + t.monto.toLocaleString() + '</span>' +
    '<button class="btn-eliminar" onclick="eliminarTransaccion(event,\'' + t.id + '\')">🗑️</button>' +
  '</div>';
}

function renderLista() {
  var lista = document.getElementById("lista");
  lista.innerHTML = "";
  var filtradas = filtrarTransacciones();
  if (filtradas.length === 0) {
    lista.innerHTML = '<div style="text-align:center;padding:40px 0;color:rgba(255,255,255,0.2)">' +
      '<p style="font-size:32px">📭</p>' +
      '<p style="font-size:13px;margin-top:8px">Sin transacciones en este periodo</p></div>';
    return;
  }
  var limite = filtradas.length > 5 ? 5 : filtradas.length;
  for (var i = 0; i < limite; i++) lista.innerHTML += crearItemHTML(filtradas[i]);
}

function verTodas() {
  var lista = document.getElementById("listaTodas");
  lista.innerHTML = "";
  var filtradas = filtrarTransacciones();
  for (var i = 0; i < filtradas.length; i++) lista.innerHTML += crearItemHTML(filtradas[i]);
  mostrarPantalla("vertodas");
  document.querySelectorAll(".nav-btn").forEach(function(b) { b.classList.remove("active"); });
}

// TOTALES
function actualizarTotales() {
  var filtradas = filtrarTransacciones();
  var ingresos = 0; var gastos = 0;
  for (var i = 0; i < filtradas.length; i++) {
    if (filtradas[i].type === "ingreso") ingresos += filtradas[i].monto;
    else gastos += filtradas[i].monto;
  }
  var balance = ingresos - gastos;
  var pct     = ingresos > 0 ? Math.round((balance / ingresos) * 100) : 0;
  document.getElementById("balance").textContent       = "$" + balance.toLocaleString();
  document.getElementById("totalIngresos").textContent = "$" + ingresos.toLocaleString();
  document.getElementById("totalGastos").textContent   = "$" + gastos.toLocaleString();
  document.getElementById("ahorroPct").textContent     = pct + "%";
  document.getElementById("barraFill").style.width     = (pct < 0 ? 0 : pct) + "%";
}

// TIPO
function setTipo(tipo) {
  tipoSeleccionado = tipo;
  document.getElementById("btnGasto").className   = "tipo-btn" + (tipo === "gasto"   ? " activo-gasto"   : "");
  document.getElementById("btnIngreso").className = "tipo-btn" + (tipo === "ingreso" ? " activo-ingreso" : "");
}

// MODAL TRANSACCION
function abrirModal() {
  editandoId = null;
  document.getElementById("modalTitulo").textContent = "Nueva transaccion";
  document.getElementById("inputDesc").value         = "";
  document.getElementById("inputMonto").value        = "";
  categoriaSeleccionada = "Comida";
  setTipo("gasto");
  renderCategoriasModal();
  document.getElementById("modalOverlay").classList.add("show");
}

function cerrarModal() {
  document.getElementById("modalOverlay").classList.remove("show");
  editandoId = null;
}

function editarTransaccion(id) {
  var t = null;
  for (var i = 0; i < transacciones.length; i++) {
    if (transacciones[i].id === id) { t = transacciones[i]; break; }
  }
  if (!t) return;
  editandoId = id;
  document.getElementById("modalTitulo").textContent = "Editar transaccion";
  document.getElementById("inputDesc").value         = t.descripcion;
  document.getElementById("inputMonto").value        = t.monto;
  categoriaSeleccionada = t.categoria;
  setTipo(t.type);
  renderCategoriasModal();
  document.getElementById("modalOverlay").classList.add("show");
}

function eliminarTransaccion(event, id) {
  event.stopPropagation();
  if (!confirm("Eliminar esta transaccion?")) return;
  eliminarTransaccionNube(id);
  mostrarToast("Eliminada", true);
}

function agregarTransaccion() {
  var desc  = document.getElementById("inputDesc").value.trim();
  var monto = parseFloat(document.getElementById("inputMonto").value);
  if (!desc || !monto || monto <= 0) { mostrarToast("Completa todos los campos", true); return; }
  var hoy   = new Date();
  var fecha = hoy.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  var t = { type: tipoSeleccionado, categoria: categoriaSeleccionada, descripcion: desc, monto: monto, fecha: fecha };
  if (editandoId) { t.id = editandoId; mostrarToast("Actualizado"); }
  else mostrarToast("Guardado");
  guardarTransaccionNube(t);
  cerrarModal();
}

// METAS
function abrirModalMeta() {
  document.getElementById("inputMetaNombre").value   = "";
  document.getElementById("inputMetaObjetivo").value = "";
  document.getElementById("inputMetaAhorrado").value = "";
  document.getElementById("modalMeta").classList.add("show");
}
function cerrarModalMeta() { document.getElementById("modalMeta").classList.remove("show"); }

function agregarMeta() {
  var nombre   = document.getElementById("inputMetaNombre").value.trim();
  var objetivo = parseFloat(document.getElementById("inputMetaObjetivo").value);
  var ahorrado = parseFloat(document.getElementById("inputMetaAhorrado").value) || 0;
  if (!nombre || !objetivo || objetivo <= 0) { mostrarToast("Completa nombre y objetivo", true); return; }
  guardarMetaNube({ nombre: nombre, objetivo: objetivo, ahorrado: ahorrado });
  cerrarModalMeta();
  mostrarToast("Meta creada");
}

function eliminarMeta(id) {
  if (!confirm("Eliminar esta meta?")) return;
  eliminarMetaNube(id);
  mostrarToast("Meta eliminada", true);
}

function abonarMeta(id) {
  var monto = parseFloat(prompt("Cuanto vas a abonar?"));
  if (!monto || monto <= 0) return;
  for (var i = 0; i < metas.length; i++) {
    if (metas[i].id === id) {
      var nuevo = metas[i].ahorrado + monto;
      if (nuevo > metas[i].objetivo) nuevo = metas[i].objetivo;
      guardarMetaNube({ id: id, nombre: metas[i].nombre, objetivo: metas[i].objetivo, ahorrado: nuevo });
      break;
    }
  }
  mostrarToast("Abono registrado");
}

function renderMetas() {
  var lista = document.getElementById("listaMetas");
  lista.innerHTML = "";
  if (metas.length === 0) {
    lista.innerHTML = '<div style="text-align:center;padding:40px 0;color:rgba(255,255,255,0.2)">' +
      '<p style="font-size:32px">🎯</p><p style="font-size:13px;margin-top:8px">Sin metas aun</p></div>';
    return;
  }
  for (var i = 0; i < metas.length; i++) {
    var m = metas[i];
    var pct = Math.round((m.ahorrado / m.objetivo) * 100);
    var llena = pct >= 100;
    lista.innerHTML += '<div class="meta-item">' +
      '<div class="meta-header">' +
        '<span class="meta-nombre">' + (llena ? "✅ " : "🎯 ") + m.nombre + '</span>' +
        '<button class="btn-meta-eliminar" onclick="eliminarMeta(\'' + m.id + '\')">🗑️</button>' +
      '</div>' +
      '<p class="meta-montos">Ahorrado: <span>$' + m.ahorrado.toLocaleString() + '</span> de $' + m.objetivo.toLocaleString() + '</p>' +
      '<div class="meta-barra-bg"><div class="meta-barra-fill ' + (llena ? "completa" : "") + '" style="width:' + (pct > 100 ? 100 : pct) + '%"></div></div>' +
      '<div class="meta-pct"><span class="' + (llena ? "completo" : "") + '">' + (llena ? "Meta cumplida!" : pct + "% completado") + '</span>' +
      (llena ? "" : '<button style="background:rgba(99,102,241,0.2);border:none;color:#818CF8;border-radius:8px;padding:3px 10px;font-size:11px;cursor:pointer" onclick="abonarMeta(\'' + m.id + '\')">+ Abonar</button>') +
      '</div></div>';
  }
}
// CATEGORIAS CUSTOM
var iconosDisponibles  = ["🌟","🏡","🚀","🎮","🍕","🎵","📱","🛒","💈","🌮","🏖️","🎲","🧴","🚴","🌿","🎨","💊","🧾","🍺","🛵"];
var coloresDisponibles = ["#FF6B6B","#51CF66","#339AF0","#CC5DE8","#20C997","#FFD43B","#FF922B","#F783AC","#74C0FC","#63E6BE","#FFA94D","#A9E34B"];

function abrirModalCategoria() {
  document.getElementById("inputCatNombre").value = "";
  iconoCustom = "🌟"; colorCustom = "#6366F1";
  renderIconosPicker(); renderColoresPicker();
  document.getElementById("modalCategoria").classList.add("show");
}
function cerrarModalCategoria() { document.getElementById("modalCategoria").classList.remove("show"); }

function renderIconosPicker() {
  var wrap = document.getElementById("iconosPicker");
  wrap.innerHTML = "";
  for (var i = 0; i < iconosDisponibles.length; i++) {
    var ic = iconosDisponibles[i];
    wrap.innerHTML += '<div onclick="selIcono(\'' + ic + '\')" style="cursor:pointer;font-size:24px;padding:6px;border-radius:10px;border:2px solid ' + (ic === iconoCustom ? "#6366F1" : "transparent") + '">' + ic + '</div>';
  }
}
function renderColoresPicker() {
  var wrap = document.getElementById("coloresPicker");
  wrap.innerHTML = "";
  for (var i = 0; i < coloresDisponibles.length; i++) {
    var cl = coloresDisponibles[i];
    wrap.innerHTML += '<div onclick="selColor(\'' + cl + '\')" style="cursor:pointer;width:28px;height:28px;border-radius:50%;background:' + cl + ';border:3px solid ' + (cl === colorCustom ? "white" : "transparent") + '"></div>';
  }
}
function selIcono(ic) { iconoCustom = ic; renderIconosPicker(); }
function selColor(cl) { colorCustom = cl; renderColoresPicker(); }

function agregarCategoriaCustom() {
  var nombre = document.getElementById("inputCatNombre").value.trim();
  if (!nombre) { mostrarToast("Escribe un nombre", true); return; }
  categoriasCustom.push({ nombre: nombre, icon: iconoCustom, color: colorCustom });
  guardarConfig();
  cerrarModalCategoria();
  renderCategoriasConfig();
  mostrarToast("Categoria creada");
}

function eliminarCategoriaCustom(nombre) {
  if (!confirm("Eliminar la categoria " + nombre + "?")) return;
  var nuevas = [];
  for (var i = 0; i < categoriasCustom.length; i++) {
    if (categoriasCustom[i].nombre !== nombre) nuevas.push(categoriasCustom[i]);
  }
  categoriasCustom = nuevas;
  guardarConfig();
  renderCategoriasConfig();
  mostrarToast("Categoria eliminada", true);
}

function renderCategoriasConfig() {
  var wrap = document.getElementById("listaCatsCustom");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (categoriasCustom.length === 0) {
    wrap.innerHTML = '<p style="color:rgba(255,255,255,0.25);font-size:12px;text-align:center;padding:10px 0">Sin categorias personalizadas aun</p>';
    return;
  }
  for (var i = 0; i < categoriasCustom.length; i++) {
    var c = categoriasCustom[i];
    wrap.innerHTML += '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.04);border-radius:12px;padding:10px 14px;margin-bottom:8px">' +
      '<span style="font-size:20px">' + c.icon + '</span>' +
      '<span style="color:white;font-size:14px;flex:1;margin-left:10px">' + c.nombre + '</span>' +
      '<div style="width:14px;height:14px;border-radius:50%;background:' + c.color + ';margin-right:10px"></div>' +
      '<button class="btn-meta-eliminar" onclick="eliminarCategoriaCustom(\'' + c.nombre + '\')">🗑️</button>' +
    '</div>';
  }
}

// REPORTES
function renderReportes() {
  var filtradas = filtrarTransacciones();
  var ingresos = 0; var gastos = 0;
  for (var i = 0; i < filtradas.length; i++) {
    if (filtradas[i].type === "ingreso") ingresos += filtradas[i].monto;
    else gastos += filtradas[i].monto;
  }
  document.getElementById("rIngresos").textContent = "$" + ingresos.toLocaleString();
  document.getElementById("rGastos").textContent   = "$" + gastos.toLocaleString();
  document.getElementById("donaMonto").textContent = "$" + gastos.toLocaleString();

  // Comparativa semana anterior
  var anterior = filtrarSemanaAnterior();
  var gastosAnt = 0;
  for (var i = 0; i < anterior.length; i++) {
    if (anterior[i].type === "gasto") gastosAnt += anterior[i].monto;
  }
  var diff    = gastos - gastosAnt;
  var diffPct = gastosAnt > 0 ? Math.round((diff / gastosAnt) * 100) : 0;
  var comparEl = document.getElementById("comparativa");
  if (comparEl) {
    var color = diff > 0 ? "#EF4444" : "#10B981";
    var icono = diff > 0 ? "↑" : "↓";
    comparEl.innerHTML = '<div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:12px 16px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.06)">' +
      '<p style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">vs semana anterior</p>' +
      '<p style="color:' + color + ';font-size:20px;font-weight:700">' + icono + ' ' + Math.abs(diffPct) + '%</p>' +
      '<p style="color:rgba(255,255,255,0.3);font-size:12px">' + (diff > 0 ? "Gastaste mas que la semana pasada" : "Gastaste menos que la semana pasada") + '</p>' +
    '</div>';
  }

  renderGraficaMeses();

  var porCategoria = {};
  for (var i = 0; i < filtradas.length; i++) {
    var t = filtradas[i];
    if (t.type === "gasto") porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + t.monto;
  }
  var ordenado = [];
  var keys = Object.keys(porCategoria);
  for (var i = 0; i < keys.length; i++) ordenado.push([keys[i], porCategoria[keys[i]]]);
  ordenado.sort(function(a, b) { return b[1] - a[1]; });
  dibujarDona(ordenado);

  var wrap = document.getElementById("barrasCategorias");
  wrap.innerHTML = "";
  if (ordenado.length === 0) {
    wrap.innerHTML = '<div style="text-align:center;padding:30px 0;color:rgba(255,255,255,0.2)"><p style="font-size:28px">📊</p><p style="font-size:13px;margin-top:8px">Sin gastos en este periodo</p></div>';
    return;
  }
  var todas = getCategorias();
  for (var i = 0; i < ordenado.length; i++) {
    var nombre = ordenado[i][0];
    var monto  = ordenado[i][1];
    var cat    = todas[nombre] || { icon: "💰", color: "#6366F1" };
    var pct    = gastos > 0 ? Math.round((monto / gastos) * 100) : 0;
    wrap.innerHTML += '<div class="cat-barra-item">' +
      '<div class="cat-barra-header"><span class="cat-barra-nombre">' + cat.icon + ' ' + nombre + '</span>' +
      '<span class="cat-barra-monto">$' + monto.toLocaleString() + '</span></div>' +
      '<div class="cat-barra-bg"><div class="cat-barra-fill" style="width:' + pct + '%;background:' + cat.color + '"></div></div>' +
      '<p class="cat-barra-pct">' + pct + '% del total</p></div>';
  }
}

function renderGraficaMeses() {
  var canvas = document.getElementById("graficaMeses");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  var hoy   = new Date();
  var datos = [];
  for (var m = 0; m < 12; m++) {
    var total = 0;
    for (var i = 0; i < transacciones.length; i++) {
      var t = transacciones[i];
      if (t.type !== "gasto" || !t.timestamp) continue;
      var fecha = t.timestamp.toDate ? t.timestamp.toDate() : new Date();
      if (fecha.getMonth() === m && fecha.getFullYear() === hoy.getFullYear()) total += t.monto;
    }
    datos.push(total);
  }
  var max  = Math.max.apply(null, datos) || 1;
  var w    = canvas.width;
  var h    = canvas.height;
  var barW = w / 12 - 4;
  for (var m = 0; m < 12; m++) {
    var barH   = (datos[m] / max) * (h - 30);
    var x      = m * (w / 12) + 2;
    var y      = h - barH - 20;
    var activo = m === hoy.getMonth();
    ctx.fillStyle = activo ? "#6366F1" : "rgba(99,102,241,0.3)";
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, barW, barH, 4); } else { ctx.rect(x, y, barW, barH); }
    ctx.fill();
    ctx.fillStyle  = activo ? "white" : "rgba(255,255,255,0.3)";
    ctx.font       = "9px sans-serif";
    ctx.textAlign  = "center";
    ctx.fillText(meses[m], x + barW / 2, h - 4);
  }
}

function dibujarDona(datos) {
  var canvas = document.getElementById("graficaDona");
  var ctx    = canvas.getContext("2d");
  var cx = canvas.width / 2; var cy = canvas.height / 2;
  var radio = 80; var grosor = 28;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (datos.length === 0) {
    ctx.beginPath(); ctx.arc(cx, cy, radio, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = grosor; ctx.stroke(); return;
  }
  var total = 0;
  for (var i = 0; i < datos.length; i++) total += datos[i][1];
  var angulo = -Math.PI / 2;
  var todas  = getCategorias();
  for (var i = 0; i < datos.length; i++) {
    var cat   = todas[datos[i][0]] || { color: "#6366F1" };
    var slice = (datos[i][1] / total) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(cx, cy, radio, angulo, angulo + slice);
    ctx.strokeStyle = cat.color; ctx.lineWidth = grosor; ctx.lineCap = "butt"; ctx.stroke();
    angulo += slice;
  }
  ctx.beginPath(); ctx.arc(cx, cy, radio - grosor / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#0D0D1A"; ctx.fill();
    }
// EXPORTAR
function exportarPDF() {
  var filtradas = filtrarTransacciones();
  var ingresos = 0; var gastos = 0;
  for (var i = 0; i < filtradas.length; i++) {
    if (filtradas[i].type === "ingreso") ingresos += filtradas[i].monto;
    else gastos += filtradas[i].monto;
  }
  var periodos = { semana: "Esta semana", mes: "Este mes", año: "Este año", todo: "Todo el historial" };
  var contenido = "FinanzApp - Reporte " + (periodos[filtroActivo] || "General") + "\n";
  contenido += "================================\n";
  contenido += "Ingresos: $" + ingresos.toLocaleString() + "\n";
  contenido += "Gastos:   $" + gastos.toLocaleString() + "\n";
  contenido += "Balance:  $" + (ingresos - gastos).toLocaleString() + "\n";
  contenido += "================================\n\n";
  contenido += "TRANSACCIONES\n";
  for (var i = 0; i < filtradas.length; i++) {
    var t = filtradas[i];
    contenido += (t.type === "ingreso" ? "+" : "-") + "$" + t.monto.toLocaleString() +
      " | " + t.descripcion + " | " + t.categoria + " | " + t.fecha + "\n";
  }
  var blob = new Blob([contenido], { type: "text/plain" });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement("a");
  a.href = url; a.download = "reporte-finanzapp.txt"; a.click();
  URL.revokeObjectURL(url);
  mostrarToast("Reporte exportado");
}

// NAVEGACION
function mostrarPantalla(nombre) {
  var pantallas = ["pantallaInicio","pantallaReportes","pantallaMetas","pantallaConfig","pantallaVerTodas"];
  for (var i = 0; i < pantallas.length; i++) {
    document.getElementById(pantallas[i]).style.display = "none";
  }
  var fab = document.getElementById("fab");
  if (nombre === "inicio") {
    document.getElementById("pantallaInicio").style.display = "block"; fab.style.display = "flex";
  } else if (nombre === "reportes") {
    document.getElementById("pantallaReportes").style.display = "block"; fab.style.display = "none"; renderReportes();
  } else if (nombre === "metas") {
    document.getElementById("pantallaMetas").style.display = "block"; fab.style.display = "none"; renderMetas();
  } else if (nombre === "config") {
    document.getElementById("pantallaConfig").style.display = "block"; fab.style.display = "none";
    renderCategoriasConfig();
    if (usuarioActual) {
      document.getElementById("configNombre").textContent = usuarioActual.displayName || "Usuario";
      document.getElementById("configEmail").textContent  = usuarioActual.email || "";
      if (usuarioActual.photoURL) document.getElementById("configFoto").src = usuarioActual.photoURL;
    }
  } else if (nombre === "vertodas") {
    document.getElementById("pantallaVerTodas").style.display = "block"; fab.style.display = "none";
  }
}

function setNav(btn) {
  document.querySelectorAll(".nav-btn").forEach(function(b) { b.classList.remove("active"); });
  btn.classList.add("active");
}

function setNavById(index) {
  document.querySelectorAll(".nav-btn").forEach(function(b) { b.classList.remove("active"); });
  var btn = document.getElementById("nav" + index);
  if (btn) btn.classList.add("active");
}

// INICIALIZAR
cargarFirebase(function() {
  auth.onAuthStateChanged(function(usuario) {
    if (usuario) {
      usuarioActual = usuario;
      document.getElementById("pantallaLogin").style.display  = "none";
      document.getElementById("appPrincipal").style.display   = "block";
      if (usuario.photoURL) {
        document.getElementById("fotoUsuario").src             = usuario.photoURL;
        document.getElementById("fotoUsuario").style.display   = "block";
        document.getElementById("avatarEmoji").style.display   = "none";
      }
      cargarDatosNube();
      renderCategorias();
    } else {
      usuarioActual = null;
      document.getElementById("pantallaLogin").style.display  = "flex";
      document.getElementById("appPrincipal").style.display   = "none";
    }
  });
});      
