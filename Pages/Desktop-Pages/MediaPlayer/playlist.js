/* =======================================================================
   SUSHIMINIS MEDIA PLAYER - LISTA DE REPRODUCCION
   =======================================================================

   COMO AGREGAR CANCIONES (3 pasos):

   1. Copiar el archivo .mp3 dentro de la carpeta:
          Pages/Desktop-Pages/MediaPlayer/music/

   2. Agregar una linea aqui abajo, dentro de los corchetes [ ], asi:

          { src: "music/mi-cancion.mp3" },

      El nombre del archivo debe coincidir EXACTAMENTE (mayusculas,
      guiones, espacios). Si no se indica el titulo, el reproductor
      usa el nombre del archivo.

   3. Guardar y subir la carpeta a Neocities. Listo.

   VERSION COMPLETA (opcional; todo menos "src" se puede omitir):

          {
            src:    "music/like-humans-do.mp3",
            title:  "Like Humans Do (radio edit)",
            artist: "David Byrne",
            album:  "Look Into The Eyeball",
            cover:  "covers/eyeball.jpg"
          },

   NOTA: cada entrada termina con coma. La ultima tambien puede tenerla.

   TAMBIEN: se pueden arrastrar archivos .mp3 desde la PC directamente
   sobre el reproductor. Se agregan al momento (leyendo sus tags ID3 y
   su portada), pero no quedan guardados al recargar la pagina. Las
   canciones de esta lista si quedan guardadas.
   ======================================================================= */

window.PLAYLIST = [

  {
    src:    "music/My Space - Don Omar.mp3",
    title:  "My Space",
    artist: "Don Omar",
    album:  "Los Bandoleros Reloaded"
  },
  {
    src:    "music/Pa' Que Retozen - Tego Calderón.mp3",
    title:  "Pa' Que Retozen",
    artist: "Tego Calderón",
    album:  "El Abayarde"
  },
  {
    src:    "music/Franco El Gorila - He Querido Quererte ft. Tico El Inmigrante - Anyer WY.mp3",
    title:  "He Querido Quererte (ft. Tico El Inmigrante)",
    artist: "Franco El Gorila",
    album:  "Anyer WY"
  },

  // ---- AGREGAR MAS CANCIONES AQUI ABAJO ----
  // { src: "music/otra-cancion.mp3" },

];
