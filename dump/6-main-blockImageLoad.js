let sky = document.querySelector("img#skyImage")
sky.onloadstart = function(e) {
    sky.src = ''
}