const toggleButton = document.getElementsByClassName('toggle-button')[0]
const navbarLinks = document.getElementsByClassName('navbar-links')[0]

toggleButton.addEventListener('click', () => {
    navbarLinks.classList.toggle('active')
})


const mediaType = document.getElementById('mediaType');
mediaType.addEventListener('change', () => {
    const Type = mediaType.value.toString()
    if (Type == 'book') {
        const oldHolder = document.querySelector('#year');
        const newHolder = document.createElement('input');
        newHolder.type = 'text';
        newHolder.size = '5';
        newHolder.name = 'year';
        newHolder.id = 'year';
        newHolder.placeholder = 'Author';
        oldHolder.parentNode.replaceChild(newHolder, oldHolder);
    } else {
        const oldHolder = document.querySelector('#year');
        const newHolder = document.createElement('input');
        newHolder.type = 'text';
        newHolder.size = '5';
        newHolder.name = 'year';
        newHolder.id = 'year';
        newHolder.placeholder = 'Year';
        oldHolder.parentNode.replaceChild(newHolder, oldHolder);
    }
})
