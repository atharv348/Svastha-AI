const ASSETS = {
    images: {},
    loaded: 0,
    total: 4,
    isReady: false
};

const imageFiles = {

    virus: 'assets/virus_sprite_1778075528015.png',
    junk: 'assets/junk_sprite_1778075551232.png',
    water: 'assets/water_sprite_1778075565668.png',
    fruit: 'assets/fruit_sprite_1778075580715.png'
};

function loadAssets(callback) {
    for (const [key, path] of Object.entries(imageFiles)) {
        const img = new Image();
        img.src = path;
        img.onload = () => {
            ASSETS.loaded++;
            if (ASSETS.loaded === ASSETS.total) {
                ASSETS.isReady = true;
                if (callback) callback();
            }
        };
        ASSETS.images[key] = img;
    }
}
