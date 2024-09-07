const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const moment = require('moment');
const haversine = require('haversine-distance');
const axios = require('axios');

const app = express();

// Use CORS middleware
app.use(cors());

app.use(express.json());

app.post('/api/save-env', async (req, res) => {
    try {
        const { GOOGLE_API_KEY } = req.body;

        if (!GOOGLE_API_KEY) {
            return res.status(400).json({ error: 'API key is required' });
        }

        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = await fs.readFile(envPath, 'utf-8');

        const updatedContent = envContent.replace(
            /GOOGLE_API_KEY=.*/,
            `GOOGLE_API_KEY=${GOOGLE_API_KEY}`
        );

        await fs.promises.writeFile(envPath, updatedContent);

        res.json({ message: 'API key saved successfully' });
    } catch (error) {
        console.error('Error saving to .env:', error);
        res.status(500).json({ error: 'Failed to save API key' });
    }
});

app.get('/trash', async (req, res) => {
    try {
        const { latitude, longitude, k = 5 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and Longitude are required' });
        }

        const userCoords = { latitude, longitude };
        const trashCarData = [];
        const csvFilePath = path.resolve(process.cwd(), '垃圾車點位資訊.csv');

        // Read and parse the CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (row) => {
                    trashCarData.push({
                        district: row['行政區'],
                        village: row['里別'],
                        team: row['分隊'],
                        carNumber: row['車號'],
                        route: row['路線'],
                        arrivalTime: row['抵達時間'],
                        departureTime: row['離開時間'],
                        longitude: parseFloat(row['經度']),
                        latitude: parseFloat(row['緯度']),
                    });
                })
                .on('end', () => resolve())
                .on('error', (error) => reject(error));
        });

        // Get current time
        const currentTime = moment();

        // Process the data: filter by time and calculate distances
        const filteredCars = trashCarData
            .filter((car) => {
                // Convert time from '1630' to 'HH:mm' format
                const convertTimeFormat = (timeStr) => {
                    if (timeStr.length !== 4) return null;
                    const hours = timeStr.slice(0, 2);
                    const minutes = timeStr.slice(2, 4);
                    return `${hours}:${minutes}`;
                };

                const departureTime = moment(convertTimeFormat(car.departureTime), 'HH:mm');

                // Check if current time is between arrival and departure time
                return currentTime < departureTime;
            })
            .map((car) => {
                const trashCarCoords = { latitude: car.latitude, longitude: car.longitude };
                // Calculate distance using Haversine formula
                const distance = haversine(userCoords, trashCarCoords);
                return { ...car, distance };
            })
            .sort((a, b) => a.distance - b.distance) // Sort by distance
            .slice(0, k); // Get the nearest k cars

        res.json(filteredCars);
    } catch (error) {
        console.error('Error fetching trash car data:', error);
        res.status(500).json({ error: 'Failed to fetch trash car data' });
    }
});

app.get('/metro', async (req, res) => {
    const { StartSID, EndSID, Lang } = req.query;
    const url = 'https://web.metro.taipei/apis/metrostationapi/routetimepathinfo';
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': 'https://web.metro.taipei',
        'Referer': 'https://web.metro.taipei/pages/tw/ticketroutetime/019/018',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
    };
    const data = {
        StartSID,
        EndSID,
        Lang
    };

    try {
        const response = await axios.post(url, data, { headers: headers });
        res.json(response.data)
    } catch (error) {
        res.status(500).json({ error: 'Failed to metro' });
    }
});

app.get('/map', async (req, res) => {
    const { origin, destination, mode, key } = req.query;
    const queryParams = new URLSearchParams({
        origin,
        destination,
        mode,
        key
    });

    const url = `https://maps.googleapis.com/maps/api/directions/json?${queryParams.toString()}`;
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': 'https://maps.googleapis.com',
        'Referer': 'https://maps.googleapis.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
    };

    try {
        const response = await axios.get(url, { headers: headers });
        res.json(response.data)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Failed to map' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
