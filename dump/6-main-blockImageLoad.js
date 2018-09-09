let sky = document.querySelector("img#skyImage")
sky.onloadstart = function(e) {
    sky.src = ''
}
// Browser Implementation에 따라서 성공여부가 갈린다.