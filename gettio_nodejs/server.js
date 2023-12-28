// --- Imports ---
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config()

// --- Express App Setup ---
const app = express();
const port = process.env.PORT;
app.use(cors());
app.use(express.json());

// --- Utility Functions ---

// Function to scrape item data from eBay
const scrapeItemData = async (url) => {
    const browser = await puppeteer.launch({ headless: "new" }); // Opting into the new headless mode
    const page = await browser.newPage();
    await page.goto(url);

    const titleSelector = 'div.vim.x-item-title h1.x-item-title__mainTitle span.ux-textspans.ux-textspans--BOLD';
    const imageSelector = 'div.ux-image-carousel-item img, div.ux-image-grid.no-scrollbar img';
    const priceSelector = 'div.x-price-primary span.ux-textspans'; // Selector for price
    let title = '', imageUrlsSet = new Set(), price = '';

    try {
        if (await page.waitForSelector(titleSelector, { visible: true, timeout: 5000 })) {
            title = await page.$eval(titleSelector, el => el.textContent.trim());
        }
        if (await page.waitForSelector(priceSelector, { visible: true, timeout: 5000 })) {
            price = await page.$eval(priceSelector, el => el.textContent.trim());
        }
        if (await page.waitForSelector(imageSelector, { visible: true, timeout: 5000 })) {
            const imageUrls = await page.$$eval(imageSelector, imgs => imgs.map(img => img.getAttribute('data-zoom-src') || img.src));
            imageUrls.forEach(url => imageUrlsSet.add(url));
        }
    } catch (error) {
        console.error('Error in scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }

    return { title, imageUrls: Array.from(imageUrlsSet), price };
};

// Function to save scraped data to the file system
const saveData = async (data, basePath) => {
    const folderName = data.title.split(' ').slice(0, 2).join('_');
    const folderPath = path.join(basePath, folderName);

    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    fs.writeFileSync(path.join(folderPath, 'title.txt'), data.title);
    fs.writeFileSync(path.join(folderPath, 'price.txt'), data.price);

    // Filter out thumbnails or smaller images and remove duplicates
    const uniqueFullSizeImageUrls = new Set(data.imageUrls.filter(url => {
        // Logic to identify full-size images
        return url.includes('s-l1600'); // Example condition
    }));

    // Save unique full-size images only
    for (const imageUrl of uniqueFullSizeImageUrls) {
        if (!imageUrl.startsWith('http')) {
            console.error(`Invalid URL: ${imageUrl}`);
            continue;
        }

        try {
            const response = await axios({ method: 'get', url: imageUrl, responseType: 'stream' });
            const writer = fs.createWriteStream(path.join(folderPath, `image_${[...uniqueFullSizeImageUrls].indexOf(imageUrl)}.jpg`));
            response.data.pipe(writer);
        } catch (error) {
            console.error(`Error downloading image from ${imageUrl}:`, error);
        }
    }
};



// --- Routes ---

app.get('/scrape', async (req, res) => {
    const url = req.query.url;
    const savePath = req.query.path; // Extract the 'path' parameter from the query

    if (!url) {
        return res.status(400).send('URL is required as a query parameter');
    }

    if (!savePath) {
        return res.status(400).send('Path is required as a query parameter');
    }

    try {
        const data = await scrapeItemData(url);
        await saveData(data, savePath); // Use the provided path
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred while scraping');
    }
});

// --- Start Server ---

// Start listening on the specified port
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
