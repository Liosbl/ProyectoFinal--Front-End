// Convierte "home-decoration" en "Home Decoration"
function Humanizar(texto) {
  texto = texto.replace(/-/g, " "); // cambia los guiones por espacios
  var palabras = texto.split(" "); // separa el texto en palabras
  for (var i = 0; i < palabras.length; i++) {
    var primeraLetra = palabras[i].charAt(0).toUpperCase();
    var resto = palabras[i].slice(1);
    palabras[i] = primeraLetra + resto;
  }
  return palabras.join(" ");
}

// Evita que un texto rompa el HTML si tiene caracteres especiales
function EscaparHtml(texto) {
  if (texto === null || texto === undefined) texto = "";
  texto = String(texto);
  texto = texto.replace(/&/g, "&amp;");
  texto = texto.replace(/</g, "&lt;");
  texto = texto.replace(/>/g, "&gt;");
  texto = texto.replace(/"/g, "&quot;");
  return texto;
}

// Da vuelta un número en formato de precio argentino: 1500 -> "$1.500"
function FormatoPrecio(numero) {
  return "$" + numero.toLocaleString("es-AR");
}

// Busca si una categoría ya está en el array CategoriasSeleccionadas
function EstaSeleccionada(nombreCategoria) {
  for (var i = 0; i < CategoriasSeleccionadas.length; i++) {
    if (CategoriasSeleccionadas[i] === nombreCategoria) return true;
  }
  return false;
}

// Busca un producto en el array Productos usando su id
function BuscarProductoPorId(id) {
  for (var i = 0; i < Productos.length; i++) {
    if (Productos[i].id === id) return Productos[i];
  }
  return null;
}

// Busca una entrada dentro del Carrito usando el id del producto.
// Devuelve el objeto { producto, cantidad } o null si no está.
function BuscarEnCarrito(id) {
  for (var i = 0; i < Carrito.length; i++) {
    if (Carrito[i].producto.id === id) return Carrito[i];
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════
     PASO 1: TRAER LOS DATOS DESDE LA API
  ════════════════════════════════════════════════════════════════ */

// "async" permite usar "await" adentro para esperar la respuesta de la API
async function CargarDatos() {
  var respuesta = await fetch(UrlApi);

  if (!respuesta.ok) {
    throw new Error("HTTP " + respuesta.status + " al consultar la API");
  }

  var json = await respuesta.json();
  var listaCruda = json.products;

  if (!listaCruda || listaCruda.length === 0) {
    throw new Error("La API no devolvió productos");
  }

  // Transformamos cada producto de la API en un objeto más simple,
  // con los nombres de propiedad que vamos a usar en toda la página.
  var listaProductos = [];
  for (var i = 0; i < listaCruda.length; i++) {
    var p = listaCruda[i];
    var precioValido = typeof p.price === "number" ? p.price : 0;
    var stockValido = typeof p.stock === "number" ? p.stock : 0;

    listaProductos.push({
      id: p.id,
      nombre: p.title || "Producto #" + p.id,
      marca: p.brand || "Sin marca",
      categoria: p.category || "Sin categoría",
      precio: precioValido,
      imagen: p.thumbnail || "",
      stock: stockValido > 0, // true si hay stock, false si no
    });
  }

  return listaProductos;
}

// Recorre la lista de productos y arma un resumen por categoría:
// [{ nombre: "beauty", cantidad: 5 }, { nombre: "furniture", cantidad: 3 }, ...]
function ListarCategorias(listaProductos) {
  var resultado = [];

  for (var i = 0; i < listaProductos.length; i++) {
    var categoria = listaProductos[i].categoria;
    var encontrada = null;

    // ¿Ya agregamos esta categoría antes?
    for (var j = 0; j < resultado.length; j++) {
      if (resultado[j].nombre === categoria) {
        encontrada = resultado[j];
        break;
      }
    }

    if (encontrada) {
      encontrada.cantidad = encontrada.cantidad + 1;
    } else {
      resultado.push({ nombre: categoria, cantidad: 1 });
    }
  }

  // Orden alfabético
  resultado.sort(function (a, b) {
    return a.nombre.localeCompare(b.nombre);
  });

  return resultado;
}

/* ═══════════════════════════════════════════════════════════════
     PASO 2: INICIALIZACIÓN DE LA PÁGINA
  ════════════════════════════════════════════════════════════════ */

async function Inicio() {
  MostrarEstado("cargando");

  try {
    Productos = await CargarDatos();
    Categorias = ListarCategorias(Productos);

    CargarCarritoDesdeLocalStorage(); // recupera el carrito guardado (si había)
    ActualizarBadgeCarrito(); // actualiza el número del botón carrito

    CargarBarraLateral();
    Cargarpantalla();
  } catch (error) {
    console.error("Error cargando el catálogo:", error);
    MostrarEstado("error", error.message);
  }
}

// Muestra un mensaje de "cargando" o de "error" dentro del pantalla principal
function MostrarEstado(tipo, mensaje) {
  var pantalla = document.getElementById("id-contenido-pantalla");

  if (tipo === "cargando") {
    pantalla.innerHTML =
      '<div class="caja-estado">' +
      '<div class="indicador-carga"></div>' +
      "<p>Cargando catálogo desde la API...</p>" +
      "</div>";
  } else {
    pantalla.innerHTML =
      '<div class="caja-estado">' +
      '<div class="icono">⚠️</div>' +
      "<p>No se pudo cargar el catálogo.<br>" +
      EscaparHtml(mensaje) +
      "</p>" +
      '<button class="boton-reintentar" id="id-boton-reintentar">Reintentar</button>' +
      "</div>";

    document
      .getElementById("id-boton-reintentar")
      .addEventListener("click", Inicio);
  }
}

/* ═══════════════════════════════════════════════════════════════
     PASO 3: BARRA LATERAL CON LAS CATEGORÍAS
  ════════════════════════════════════════════════════════════════ */

function CargarBarraLateral() {
  var lista = document.getElementById("id-lista-categorias");
  lista.innerHTML = ""; // limpiamos lo que hubiera antes

  for (var i = 0; i < Categorias.length; i++) {
    var categoria = Categorias[i];
    var activa = EstaSeleccionada(categoria.nombre);

    // Creamos la fila (un <label> con un checkbox adentro)
    var fila = document.createElement("label");
    fila.className = activa ? "item-categoria tildado" : "item-categoria";

    var marcadoHtml = activa ? "checked" : "";

    fila.innerHTML =
      '<input type="checkbox" ' +
      marcadoHtml +
      ">" +
      '<span class="nombre-categoria">' +
      EscaparHtml(Humanizar(categoria.nombre)) +
      "</span>" +
      '<span class="contador-categoria">' +
      categoria.cantidad +
      "</span>";

    // Cuando se tilda o destilda el checkbox, actualizamos el filtro
    var checkbox = fila.querySelector("input");
    checkbox.addEventListener(
      "change",
      (function (nombreDeEstaCategoria) {
        return function () {
          if (this.checked) {
            CategoriasSeleccionadas.push(nombreDeEstaCategoria);
          } else {
            var nuevaLista = [];
            for (var k = 0; k < CategoriasSeleccionadas.length; k++) {
              if (CategoriasSeleccionadas[k] !== nombreDeEstaCategoria) {
                nuevaLista.push(CategoriasSeleccionadas[k]);
              }
            }
            CategoriasSeleccionadas = nuevaLista;
          }
          CargarBarraLateral();
          Cargarpantalla();
        };
      })(categoria.nombre),
    );

    lista.appendChild(fila);
  }
}

document
  .getElementById("id-boton-limpiar-filtros")
  .addEventListener("click", function () {
    CategoriasSeleccionadas = [];
    CargarBarraLateral();
    Cargarpantalla();
  });

/* ═══════════════════════════════════════════════════════════════
     PASO 4: RENDER PRINCIPAL (decide qué mostrar en el pantalla)
  ════════════════════════════════════════════════════════════════ */

function Cargarpantalla() {
  ActualizarCabecera();
  if (ModoVista === "carrito") {
    MostrarCarrito();
  } else {
    MostrarProductos();
  }
}

// Actualiza el título de arriba y el botón de "vaciar carrito"
function ActualizarCabecera() {
  var titulo = document.getElementById("id-titulo-pantalla");
  var acciones = document.getElementById("id-acciones-pantalla");

  if (ModoVista === "carrito") {
    titulo.textContent = "Tu carrito";

    if (Carrito.length > 0) {
      acciones.innerHTML =
        '<button class="boton-vaciar-carrito" id="id-boton-vaciar-carrito">Vaciar carrito</button>';
      document
        .getElementById("id-boton-vaciar-carrito")
        .addEventListener("click", VaciarCarrito);
    } else {
      acciones.innerHTML = "";
    }
  } else {
    if (CategoriasSeleccionadas.length > 0) {
      var nombres = [];
      for (var i = 0; i < CategoriasSeleccionadas.length; i++) {
        nombres.push(Humanizar(CategoriasSeleccionadas[i]));
      }
      titulo.textContent = "Productos · " + nombres.join(", ");
    } else {
      titulo.textContent = "Todos los productos";
    }
    acciones.innerHTML = "";
  }
}

/* ═══════════════════════════════════════════════════════════════
     PASO 5: CATÁLOGO DE PRODUCTOS
  ════════════════════════════════════════════════════════════════ */

// Devuelve solo los productos que corresponden a las categorías tildadas.
// Si no hay ninguna tildada, devuelve todos.
function ProductosFiltrados() {
  if (CategoriasSeleccionadas.length === 0) {
    return Productos;
  }

  var resultado = [];
  for (var i = 0; i < Productos.length; i++) {
    if (EstaSeleccionada(Productos[i].categoria)) {
      resultado.push(Productos[i]);
    }
  }
  return resultado;
}

function MostrarProductos() {
  var pantalla = document.getElementById("id-contenido-pantalla");
  var contador = document.getElementById("id-contador-resultados");
  var lista = ProductosFiltrados();

  if (lista.length === 0) {
    pantalla.innerHTML =
      '<div class="caja-estado">' +
      '<div class="icono">🔍</div>' +
      "<p>No se encontraron productos para los filtros aplicados.</p>" +
      "</div>";
    contador.textContent = "";
    return;
  }

  contador.textContent =
    lista.length + (lista.length === 1 ? " producto" : " productos");

  // Creamos el contenedor de la grilla
  var grilla = document.createElement("div");
  grilla.className = "grilla-productos";

  for (var i = 0; i < lista.length; i++) {
    var producto = lista[i];
    var entradaCarrito = BuscarEnCarrito(producto.id);

    var imagenHtml = "📦";
    if (producto.imagen) {
      imagenHtml =
        '<img src="' +
        EscaparHtml(producto.imagen) +
        '" alt="' +
        EscaparHtml(producto.nombre) +
        '" ' +
        'loading="lazy" onerror="this.parentElement.textContent=\'📦\';">';
    }

    var textoBoton = "Agregar al carrito";
    if (!producto.stock) {
      textoBoton = "Sin stock";
    } else if (entradaCarrito) {
      textoBoton = "En el carrito · " + entradaCarrito.cantidad;
    }

    var tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-producto";
    tarjeta.innerHTML =
      '<div class="imagen-tarjeta">' +
      imagenHtml +
      "</div>" +
      '<div class="categoria-tarjeta">' +
      EscaparHtml(Humanizar(producto.categoria)) +
      "</div>" +
      '<div class="nombre-tarjeta">' +
      EscaparHtml(producto.nombre) +
      "</div>" +
      '<div class="marca-tarjeta">' +
      EscaparHtml(producto.marca) +
      "</div>" +
      '<div class="pie-tarjeta">' +
      '<div class="precio">' +
      FormatoPrecio(producto.precio) +
      "</div>" +
      '<span class="distintivo-stock ' +
      (producto.stock ? "distintivo-en-stock" : "distintivo-sin-stock") +
      '">' +
      (producto.stock ? "En stock" : "Sin stock") +
      "</span>" +
      "</div>" +
      '<button class="boton-agregar ' +
      (entradaCarrito ? "en-carrito" : "") +
      '" ' +
      (producto.stock ? "" : "disabled") +
      ">" +
      textoBoton +
      "</button>";

    // El botón "Agregar" solo funciona si hay stock
    if (producto.stock) {
      var boton = tarjeta.querySelector(".boton-agregar");
      boton.addEventListener(
        "click",
        (function (idDeEsteProducto) {
          return function () {
            AgregarAlCarrito(idDeEsteProducto);
          };
        })(producto.id),
      );
    }

    grilla.appendChild(tarjeta);
  }

  pantalla.innerHTML = "";
  pantalla.appendChild(grilla);
}

/* ═══════════════════════════════════════════════════════════════
     PASO 6: CARRITO DE COMPRAS
  ════════════════════════════════════════════════════════════════ */

// Guarda el carrito actual en localStorage.
// Solo guardamos el id y la cantidad de cada producto, no el producto entero,
// así evitamos guardar datos duplicados o desactualizados.
function GuardarCarritoEnLocalStorage() {
  var datosParaGuardar = [];

  for (var i = 0; i < Carrito.length; i++) {
    datosParaGuardar.push({
      id: Carrito[i].producto.id,
      cantidad: Carrito[i].cantidad,
    });
  }

  // localStorage solo guarda texto, por eso usamos JSON.stringify
  var texto = JSON.stringify(datosParaGuardar);
  localStorage.setItem(CLAVE_CARRITO_EN_LOCALSTORAGE, texto);
}

// Lee el carrito guardado en localStorage y reconstruye el array Carrito.
// Hay que llamarla DESPUÉS de haber cargado los Productos desde la API,
// porque necesita buscar cada producto por su id.
function CargarCarritoDesdeLocalStorage() {
  var texto = localStorage.getItem(CLAVE_CARRITO_EN_LOCALSTORAGE);

  if (!texto) return; // no había nada guardado, no hacemos nada

  var datosGuardados;
  try {
    datosGuardados = JSON.parse(texto);
  } catch (error) {
    return; // el texto guardado estaba corrupto, lo ignoramos
  }

  var carritoReconstruido = [];
  for (var i = 0; i < datosGuardados.length; i++) {
    var producto = BuscarProductoPorId(datosGuardados[i].id);

    // Solo lo agregamos si el producto todavía existe en la API
    if (producto) {
      carritoReconstruido.push({
        producto: producto,
        cantidad: datosGuardados[i].cantidad,
      });
    }
  }

  Carrito = carritoReconstruido;
}

function AgregarAlCarrito(id) {
  var producto = BuscarProductoPorId(id);
  if (!producto || !producto.stock) return;

  var entrada = BuscarEnCarrito(id);
  if (entrada) {
    entrada.cantidad = entrada.cantidad + 1;
  } else {
    Carrito.push({ producto: producto, cantidad: 1 });
  }

  GuardarCarritoEnLocalStorage();
  ActualizarBadgeCarrito();
  Cargarpantalla();
}

function CambiarCantidad(id, delta) {
  var entrada = BuscarEnCarrito(id);
  if (!entrada) return;

  entrada.cantidad = entrada.cantidad + delta;

  if (entrada.cantidad <= 0) {
    QuitarDelCarrito(id);
    return;
  }

  GuardarCarritoEnLocalStorage();
  ActualizarBadgeCarrito();
  MostrarCarrito();
}

function QuitarDelCarrito(id) {
  var nuevoCarrito = [];
  for (var i = 0; i < Carrito.length; i++) {
    if (Carrito[i].producto.id !== id) {
      nuevoCarrito.push(Carrito[i]);
    }
  }
  Carrito = nuevoCarrito;

  GuardarCarritoEnLocalStorage();
  ActualizarBadgeCarrito();
  MostrarCarrito();
}

function VaciarCarrito() {
  Carrito = [];
  GuardarCarritoEnLocalStorage();
  ActualizarBadgeCarrito();
  Cargarpantalla();
}

// Actualiza el número que aparece arriba a la derecha, sobre el botón carrito
function ActualizarBadgeCarrito() {
  var badge = document.getElementById("id-contador-carrito");
  var total = 0;
  for (var i = 0; i < Carrito.length; i++) {
    total = total + Carrito[i].cantidad;
  }
  badge.textContent = total;

  if (total === 0) {
    badge.classList.add("cero");
  } else {
    badge.classList.remove("cero");
  }
}

function ActualizarBotonCarrito() {
  var boton = document.getElementById("id-boton-carrito");
  var etiqueta = document.getElementById("id-etiqueta-carrito");

  boton.setAttribute(
    "aria-pressed",
    ModoVista === "carrito" ? "true" : "false",
  );
  etiqueta.textContent =
    ModoVista === "carrito" ? "Volver al catálogo" : "Carrito";
}

document
  .getElementById("id-boton-carrito")
  .addEventListener("click", function () {
    ModoVista = ModoVista === "carrito" ? "catalogo" : "carrito";
    ActualizarBotonCarrito();
    Cargarpantalla();
    IrArriba(); // subimos el scroll para que se vea el contenido desde el principio
  });

// Sube el scroll de la página hasta el principio.
// La usamos cada vez que cambiamos de pantalla (catálogo <-> carrito)
// para que el usuario no se quede viendo una parte vacía más abajo.
function IrArriba() {
  window.scrollTo({ top: 0, behavior: "instant" });
}

function MostrarCarrito() {
  var pantalla = document.getElementById("id-contenido-pantalla");
  var contador = document.getElementById("id-contador-resultados");

  if (Carrito.length === 0) {
    pantalla.innerHTML =
      '<div class="caja-estado">' +
      '<div class="icono">🛒</div>' +
      "<p>Tu carrito está vacío. Agregá productos desde el catálogo.</p>" +
      "</div>";
    contador.textContent = "";
    return;
  }

  var listaContenedor = document.createElement("div");
  listaContenedor.className = "lista-carrito";

  var cantidadTotal = 0;
  var precioTotal = 0;

  for (var i = 0; i < Carrito.length; i++) {
    var entrada = Carrito[i];
    var producto = entrada.producto;
    var cantidad = entrada.cantidad;

    cantidadTotal = cantidadTotal + cantidad;
    precioTotal = precioTotal + producto.precio * cantidad;

    var imagenHtml = "📦";
    if (producto.imagen) {
      imagenHtml =
        '<img src="' +
        EscaparHtml(producto.imagen) +
        '" alt="' +
        EscaparHtml(producto.nombre) +
        '" ' +
        'loading="lazy" onerror="this.parentElement.textContent=\'📦\';">';
    }

    var fila = document.createElement("div");
    fila.className = "fila-carrito";
    fila.innerHTML =
      '<div class="imagen-fila-carrito">' +
      imagenHtml +
      "</div>" +
      "<div>" +
      '<div class="nombre-fila-carrito">' +
      EscaparHtml(producto.nombre) +
      "</div>" +
      '<div class="categoria-fila-carrito">' +
      EscaparHtml(producto.marca) +
      " · " +
      EscaparHtml(Humanizar(producto.categoria)) +
      "</div>" +
      "</div>" +
      '<div class="cantidad-fila-carrito">' +
      '<button class="boton-cantidad" data-accion="restar">−</button>' +
      '<span class="valor-cantidad">' +
      cantidad +
      "</span>" +
      '<button class="boton-cantidad" data-accion="sumar">+</button>' +
      "</div>" +
      '<div class="precio-fila-carrito">' +
      FormatoPrecio(producto.precio * cantidad) +
      "</div>" +
      '<button class="boton-quitar-fila" title="Quitar">✕</button>';

    // Conectamos los botones de esta fila con sus funciones,
    // usando una función que "recuerda" el id del producto (closure)
    (function (idDeEstaFila) {
      fila
        .querySelector('[data-accion="restar"]')
        .addEventListener("click", function () {
          CambiarCantidad(idDeEstaFila, -1);
        });
      fila
        .querySelector('[data-accion="sumar"]')
        .addEventListener("click", function () {
          CambiarCantidad(idDeEstaFila, 1);
        });
      fila
        .querySelector(".boton-quitar-fila")
        .addEventListener("click", function () {
          QuitarDelCarrito(idDeEstaFila);
        });
    })(producto.id);

    listaContenedor.appendChild(fila);
  }

  var resumen = document.createElement("div");
  resumen.className = "resumen-carrito";
  resumen.innerHTML =
    '<span class="etiqueta-resumen">Total</span>' +
    '<span class="total-resumen">' +
    FormatoPrecio(precioTotal) +
    "</span>";
  listaContenedor.appendChild(resumen);

  pantalla.innerHTML = "";
  pantalla.appendChild(listaContenedor);

  contador.textContent =
    cantidadTotal +
    (cantidadTotal === 1 ? " unidad · " : " unidades · ") +
    FormatoPrecio(precioTotal);
}
