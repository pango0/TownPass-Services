<template>
    <div class="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div class="flex-grow overflow-y-auto p-4 space-y-4" ref="chatContainer">
            <div v-for="message in chatHistory" :key="message.id" class="p-3 rounded-lg fade-in"
                :class="message.isUser ? 'bg-tiffany-blue text-white' : 'bg-gray-100'">
                <p class="font-semibold">{{ message.isUser ? '你' : '人工智慧助理' }}:</p>
                <div v-if="message.isUser" class="mt-1">{{ message.content }}</div>
                <div v-else v-html="renderMarkdown(message.content)" class="mt-1 prose prose-sm max-w-none"></div>
                <div v-for="location in message.locations" :key="location.latitude" style="padding: 12px">
                    <div>
                        <span>{{ location.title }}</span>
                    </div>
                    <iframe class="w-full h-[300px] rounded-lg" height="300" style="border: 0" loading="lazy"
                        allowfullscreen referrerpolicy="no-referrer-when-downgrade"
                        :src="`https://www.google.com/maps/embed/v1/directions?key=AIzaSyCpQnECnOpwD9-XT_Jah9o5qlqBHChW7IU&origin=${userLatitude},${userLongitude}&destination=${location.latitude},${location.longitude}&mode=walking`"></iframe>
                </div>
                <div v-if="message.suggestedService != null" class="mt-4">
                    <!-- 標題 -->
                    <div class="text-semibold font-bold mb-2 text-gray-700">
                        建議的服務：
                    </div>
                    <!-- 將整個卡片變成連結，並且使其具有外框裝飾 -->
                    <a :href="message.suggestedService.url" target="_blank"
                        class="inline-block p-3 bg-gray-100 rounded-lg border border-tiffany-blue shadow-lg text-tiffany-blue hover:bg-tiffany-blue transition-all duration-300 ease-in-out transform hover:scale-105">
                        <div class="font-semibold">
                            {{ message.suggestedService.text }}
                        </div>
                    </a>
                </div>
            </div>
        </div>
        <div class="p-4 bg-white border-t border-gray-200">
            <div class="overflow-x-auto whitespace-nowrap mb-4">
                <button v-for="query in commonQueries" :key="query" @click="sendCommonQuery(query)"
                    class="inline-block px-3 py-1 mr-2 text-sm bg-white-200 text-gray-700 rounded-full border border-[#0abab5] hover:bg-gray-300 transition-colors">
                    {{ query }}
                </button>
            </div>
            <form class="flex items-center" @submit.prevent="sendMessage">
                <button @click="toggleVoiceInput" class="bg-gray-200 p-2 rounded-full focus:outline-none mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            d="M10 18a3 3 0 003-3h-6a3 3 0 003 3zM7 5a3 3 0 116 0v4a3 3 0 11-6 0V5zm5 8a5 5 0 01-10 0v-1a1 1 0 012 0v1a3 3 0 006 0v-1a1 1 0 012 0v1z" />
                    </svg>
                </button>
                <input v-model="userInput" :disabled="loading"
                    class="flex-grow h-10 px-4 border border-tiffany-blue rounded-full focus:outline-none focus:ring-2 focus:ring-tiffany-blue"
                    placeholder="輸入你的問題" />
                <button @click="sendMessage" :disabled="loading"
                    class="ml-2 bg-tiffany-blue text-white h-10 w-10 rounded-full hover:bg-tiffany-blue-dark transition-colors flex items-center justify-center">
                    <template v-if="loading">
                        <span class="loader"></span>
                    </template>
                    <template v-else>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform rotate-90" viewBox="0 0 20 20"
                            fill="currentColor">
                            <path
                                d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </template>
                </button>
            </form>
        </div>
    </div>
</template>

<style>
/* Add this to your CSS file or within a <style> block */
@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.fade-in {
    animation: fadeIn 0.5s ease-in-out;
}
</style>

<script setup lang="ts">
import { Document } from "langchain/document";
import { ref, onMounted, nextTick } from 'vue';
import { marked } from 'marked';
import {
    getNearestRentableStation,
    getNearestReturnableStation,
    type YouBikeDataWithDistance
} from './youbike';
import { getNearestMetroStation, getTimeBetweenStation, type MetroDataWithDistance } from './metro';
import { getDistance } from './distance';
import { googleSearch } from './search';
import { fetchWeatherData, type BotResponse } from './weather';
import { type TrashCarData, getNearestTrashCarLocations } from './trash';
import { useUserStore } from '../stores/user';
import { getTransitRoute, type TransitRoute } from './route_planning';
import { getCoordinatesByPlaceName } from './getCoordinates';
import { query_db } from './db';
// console.log(query_db("忘記密碼怎麼辦？"))
const userStore = useUserStore();
let userName = 'Guest';

let userLatitude: number | null = null;
let userLongitude: number | null = null;
// async function hhh() {
//     // Sample usage
//     const metroNetwork: Line[] = await fetchMetroGraphData();
//     const graph = buildGraph(metroNetwork);

//     const startStationID = "R10";  // Example: Taipei Nangang Exhibition Center
//     const endStationID = "G07";    // Example: Taipei Main Station

//     const result = dijkstra(graph, startStationID, endStationID);
//     console.log(`Shortest time: ${result.time} seconds`);
//     console.log(`Path: ${result.path.join(" -> ")}`);
// }
// hhh()

const commonQueries = ref([
    '附近有哪裡可以租YouBike？',
    '附近有哪裡可以還YouBike？',
    '最近的捷運站在哪裡？',
    '台北市有哪些景點推薦？',
    '今天天氣如何？',
    '最近的垃圾車地點在哪裡？'
]);
const sendCommonQuery = (query: string) => {
    userInput.value = query;
    sendMessage();
};

function initGeolocation(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLatitude = position.coords.latitude;
                    userLongitude = position.coords.longitude;
                    resolve();
                },
                (error) => {
                    reject(error);
                }
            );
        } else {
            reject(new Error('Geolocation is not supported by this browser.'));
        }
    });
}



const MapapiKey = import.meta.env.VITE_GoogleMap_API_KEY;;

const userInput = ref('');
const chatHistory = ref<
    Array<{
        id: number;
        isUser: boolean;
        content: string;
        locations: Array<{
            title: string;
            latitude: number;
            longitude: number;
        }>;
        suggestedService: {
            text: string;
            url: string;
        } | null;
    }>
>([]);
const loading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'zh-TW'; 
recognition.continuous = false; 
recognition.interimResults = true;

const isListening = ref(false);
let mediaStream = null;

const GOOGLE_API_KEY = import.meta.env.VITE_GoogleMap_API_KEY;
 
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const base64Audio = await convertBlobToBase64(audioBlob);

            // Send the base64 audio to Google Cloud API
            const transcription = await transcribeAudio(base64Audio);
            userInput.value = transcription;
        };

        mediaRecorder.start();
        setTimeout(() => {
            mediaRecorder.stop();
        }, 5000); // Record for 5 seconds
    } catch (error) {
        console.error('Error accessing microphone:', error);
    }
}

function convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function transcribeAudio(base64Audio: string): Promise<string> {
    try {
        const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                config: {
                    encoding: 'WEBM_OPUS',  // Verify if 'WEBM_OPUS' is the correct format
                    sampleRateHertz: 48000, // Ensure the sample rate matches your audio
                    languageCode: 'zh-TW'   // Language code for Traditional Chinese
                },
                audio: {
                    content: base64Audio    // Base64 encoded audio content
                }
            })
        });

        const data = await response.json();
        
        if (response.ok && data.results) {
            return data.results[0]?.alternatives[0]?.transcript || 'Transcription failed.';
        } else {
            console.error('Error in transcription response:', data);
            return 'Transcription failed.';
        }
    } catch (error) {
        console.error('Error transcribing audio:', error);
        return 'Error transcribing audio.';
    }
}


const toggleVoiceInput = async () => {
    if (isListening.value) {
        stopVoiceInput();
    } else {
        try {
            await startVoiceInput();
            startRecording();  // Start recording here
        } catch (error) {
            console.error('Error starting voice input:', error);
            alert('Unable to access the microphone. Please check your browser settings.');
        }
    }
};

const startVoiceInput = async () => {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted');
        isListening.value = true;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Failed to access the microphone. Please check your browser settings.');
    }
};

const stopVoiceInput = () => {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    isListening.value = false;
};

async function getWeather(locationName: string): Promise<BotResponse> {
    // Replace with actual weather API URL
    try {
        // initGeolocation();
        console.log(locationName)
        return await fetchWeatherData(locationName);
    } catch (error) {
        console.error('Error fetching weather:', error);
        return {
            message: "Sorry, I couldn't fetch the weather data."
        };
    }
}

function getServiceInfo(appName: string): { text: string; url: string; } {
    const serviceUrls: { [key: string]: string } = {
        "申辦服務": 'https://taipei-pass-service.vercel.app/',
        "市民儀表板": 'https://dashboard.gov.taipei/',
        "找地點": 'https://taipei-pass-service.vercel.app/surrounding-service/'
    };

    return {
        text: appName,
        url: serviceUrls[appName] || "https://townpass.taipei/"
    };
}

async function getServices(appName: string): Promise<{ text: string; url: string; }> {
    const serviceUrls: { [key: string]: string } = {
        "申辦服務": 'https://taipei-pass-service.vercel.app/',
        "市民儀表板": 'https://dashboard.gov.taipei/',
        "找地點": 'https://taipei-pass-service.vercel.app/surrounding-service/'
    };
    const desc = {
        "1999": "播打網路語音通話",
        "申辦服務": "線上申辦市政府服務個項目（市民）",
        "有話要說": "陳情系統",
        "臨櫃叫號": "臨櫃服務查看叫號、預約",
        "網路投票": "收集民意，促進民眾參與市政服務",
        "市民儀表板": "提供臺北市生活的重要數據",
        "意見調查": "了解民眾與台北市互動體驗調查",
        "警政服務": "提供線上、語音報案",
        "里辦服務": "提供居民更即時在地區里服務",
        "疫苗預約": "預約Covid-19、流感疫苗施打",
        "聯醫掛號": "北市聯合醫院各院區線上掛號",
        "台北電台": "線上即時收聽-臺北廣播電台",
        "親子館": "線上預約各區親子館活動報名",
        "簡單森呼吸": "提供綠化地圖資訊",
        "寵物安心遛": "提供寵物友善地圖資訊",
        "用水服務": "繳交水費、查詢或自報用水度數",
        "民生物資": "提供北市民生物資交易量與金額",
        "圖書借閱": "市立圖書館借閱服務",
        "愛遊動物園": "動物園區資訊導覽、線上地圖",
        "智慧客服": "台北通智慧客服機器人"
    }

    return desc[appName];
}

async function findRentableStation(k: number, lat:number, long:number): Promise<YouBikeDataWithDistance[] | null> {
    try {
        return await getNearestRentableStation(k, lat, long);
    } catch (error) {
        console.error('Error finding nearest rentable station:', error);
        return null;
    }
}

async function findReturnableStation(k: number, lat:number, long:number): Promise<YouBikeDataWithDistance[] | null> {
    try {
        return await getNearestReturnableStation(k, lat, long);
    } catch (error) {
        console.error('Error finding nearest returnable station:', error);
        return null;
    }
}

async function findNearestMetroStation(k: number, lat: number, long: number): Promise<MetroDataWithDistance[] | null> {
    try {
        // initGeolocation();
        return await getNearestMetroStation(k, lat, long);
    } catch (error) {
        console.error('Error finding nearest metro station:', error);
        return null;
    }
}

async function findTimeBetweenStation(station_1: string, station_2: string): Promise<any | null> {
    try {
        return await getTimeBetweenStation(station_1, station_2);
    } catch (error) {
        console.error('Error finding time between station:', error);
        return null
    }
}

async function findDistance(lat1: number, lon1: number): Promise<any | null> {
    try {
        initGeolocation();
        return await getDistance(lat1, lon1, userLatitude, userLongitude);
    } catch (error) {
        console.error('Error finding nearest metro station:', error);
        return null;
    }
}

async function getCoordinates(location: string) {
    try {
        return await getCoordinatesByPlaceName(location);
    } catch (error) {
        console.error('Error finding coordinates:', error);
        return null;
    }
}

async function searchGoogle(query: string): Promise<any | null> {
    try {
        return await googleSearch(query);
    } catch (error) {
        console.error('Error searching Google:', error);
        return null;
    }
}

async function findTrashCarLocation(k: number): Promise<TrashCarData[] | null> {
    try {
        initGeolocation();
        return await getNearestTrashCarLocations(k);
    } catch (error) {
        console.error('Error fetching trash car locations:', error);
        return [];
    }
}

async function fetchAllRoutesToDestination(origin: string, destination: string, mode: string): Promise<TransitRoute | null> {
    loading.value = true;
    try {
        return await getTransitRoute(origin, destination, mode, MapapiKey);
    } catch (error) {
        console.error('Error fetching route:', error);
        return null;
    }
}

async function get_db(query: string) {
    try {
        return await query_db(query);
    } catch (error) {
        console.error('Error fetching query:', error);
        return null;
    }
}

const functionDeclarations = [
    {
        name: 'getWeather',
        description: 'This tool is used to get a location\'s current weather forecast, including temperature and condition.',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'This is the location you want to know the weather.'
                }
            }
        }
    },
    {
        name: 'findRentableStation',
        description:
            "This tool is used to get the kth nearest YouBike station's data from a location where there are available bikes to rent from the user.",
        parameters: {
            type: 'object',
            properties: {
                k: {
                    type: 'number',
                    description: 'This parameter is the number of stations you want to retrieve.'
                },
                lat:{
                    type: 'number',
                    description: 'This is the latitude of the location'
                },
                long:{
                    type: 'number',
                    description: 'This is the longtitude of the location'
                }
            },
            required: ['k', 'lat', 'long']
        }
    },
    {
        name: 'findReturnableStation',
        description:
            "This tool is used to get the kth nearest YouBike station's data from a location where there are available vacancies to return the bikes from the user.",
        parameters: {
            type: 'object',
            properties: {
                k: {
                    type: 'number',
                    description: 'This parameter is k.'
                },
                lat:{
                    type: 'number',
                    description: 'This is the latitude of the location'
                },
                long:{
                    type: 'number',
                    description: 'This is the longtitude of the location'
                }
            },
            required: ['k', 'lat', 'long']
        }
    },
    {
        name: 'findNearestMetroStation',
        description: "Get the kth nearest Metro station's data from a location, including the distance from the user.",
        parameters: {
            type: 'object',
            properties: {
                k: {
                    type: 'number',
                    description: 'This parameter is the number of stations you want to retrieve.'
                },
                lat:{
                    type: 'number',
                    description: 'This parameter is the latitude of the location'
                },
                long:{
                    type: 'number',
                    description: 'This parameter is the longtitude of the location'
                }
            },
            required: ['k', 'lat', 'long']
        }
    },
    {
        name: "getCoordinates",
        description: "This tool can retrieve the coordinates of a location.",
        parameters: {
            type: "object", properties: {
                location: {
                    type: "string",
                    description: "This parameter is the name of the location"
                },
            }
        }
    },
    {
        name: 'searchGoogle',
        description: "Tool to obtain information you don't already know.",
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query you want to use'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'findTrashCarLocation',
        description:
            'Get the kth nearest trash car location that is available today, including location and arrive time',
        parameters: {
            type: 'object',
            properties: {
                k: {
                    type: 'number',
                    description: 'This parameter is k.'
                }
            }
        }
    },
    {
        name: 'findTimeBetweenStation',
        description:
            'Get the travel time and route between two metro stations, don\'t provide urls',
        parameters: {
            type: 'object',
            properties: {
                station_1: {
                    type: 'string',
                    description: 'This is the first station\'s name in traditional chinese'
                },
                station_2: {
                    type: 'string',
                    description: 'This is the second station\'s name in traditional chinese'
                }
            },
            required: ['station_1', 'station_2']

        }
    },
    {
        name: 'fetchAllRoutesToDestination',
        description: '如果不是捷運站而且是兩個地點的查詢，使用這個工具',
        parameters: {
            type: 'object',
            properties: {
                origin: {
                    type: 'string',
                    description: '起點名稱'
                },
                destination: {
                    type: 'string',
                    description: '終點名稱'
                }
            },
            required: ['origin', 'destination']
        }
    },
    {
        name: "getServices",
        description: `取得服務的網址`,
        parameters: {
            type: "object",
            properties: {
                appName: {
                    type: "string",
                    enum: [
                        '1999',
                        '申辦服務',
                        '有話要說',
                        '臨櫃叫號',
                        '網路投票',
                        '市民儀表板',
                        '意見調查',
                        '警政服務',
                        '里辦服務',
                        '疫苗預約',
                        '聯醫掛號',
                        '台北電台',
                        '親子館',
                        '簡單森呼吸',
                        '寵物安心遛',
                        '用水服務',
                        '民生物資',
                        '圖書借閱',
                        '找地點',
                        '愛遊動物園',
                        '智慧客服'
                    ],
                    description: "The name of the service the user is requesting."
                }
            },
            required: ["appName"]
        }
    },
    {
        name: 'get_db',
        description: '此工具可以獲取有關台北通的資訊，若使用此工具請整合答案後再回答',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: '要問的問題'
                },
            },
            required: ['query']
        }
    },
];

const functions = {
    findRentableStation,
    findReturnableStation,
    findNearestMetroStation,
    // findDistance
    searchGoogle,
    getWeather,
    findTrashCarLocation,
    findTimeBetweenStation,
    getCoordinates,
    fetchAllRoutesToDestination,
    getServices,
    get_db
};

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const renderMarkdown = (text: string) => {
    return marked(text);
};

const SYSTEM_PROMPT = `你是一位台北市的助理，你叫做「台北通智慧助理」. 你有以下服務：
1999: 播打網路語音通話
申辦服務: 線上申辦市政府服務個項目（市民）
有話要說: 陳情系統
臨櫃叫號: 臨櫃服務查看叫號、預約
網路投票: 收集民意，促進民眾參與市政服務
市民儀表板: 提供臺北市生活的重要數據
意見調查: 了解民眾與台北市互動體驗調查
警政服務: 提供線上、語音報案
里辦服務: 提供居民更即時在地區里服務
疫苗預約: 預約Covid-19、流感疫苗施打
聯醫掛號: 北市聯合醫院各院區線上掛號
台北電台: 線上即時收聽-臺北廣播電台
親子館: 線上預約各區親子館活動報名
簡單森呼吸: 提供綠化地圖資訊
寵物安心遛: 提供寵物友善地圖資訊
用水服務: 繳交水費、查詢或自報用水度數
民生物資: 提供北市民生物資交易量與金額
圖書借閱: 市立圖書館借閱服務
愛遊動物園: 動物園區資訊導覽、線上地圖
智慧客服: 台北通智慧客服機器人

請用繁體中文回答問題.請透過函式呼叫一步一步得到答案，請勿放棄`;
const sendMessage = async () => {
    if (userInput.value.trim() === '') return;
    loading.value = true;
    chatHistory.value.push({ id: Date.now(), isUser: true, content: userInput.value });
    const query = userInput.value;
    userInput.value = '';
    await nextTick();
    scrollToBottom();
    console.log(query)
    try {
        // Prepare the payload for OpenAI API
        const messages = [
            {
                role: 'system', content: SYSTEM_PROMPT
            },
            ...chatHistory.value.map(chat => ({
                role: chat.isUser ? 'user' : 'assistant',
                content: chat.content
            })).slice(-5),
        ];

        const body = {
            model: 'gpt-4o',
            messages: messages,
            functions: functionDeclarations, // Pass any function declarations
            function_call: 'auto', // Let the model decide when to call a function
        };

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });
        console.log('response', response)
        const result = await response.json();
        console.log('result', result)
        const aiResponse = result.choices[0].message;
        const text = aiResponse.content;
        const functionCall = aiResponse.function_call;
        console.log(text);
        console.log(functionCall);
        let suggestedService = null;
        if (functionCall) {
            // Process function calls
            const functionName = functionCall.name;
            const functionArgs = JSON.parse(functionCall.arguments);

            if (functionName in functions) {
                let functionResult;

                if (functionName === 'searchGoogle' && functionArgs.query) {
                    functionResult = await functions[functionName](functionArgs.query);
                } else if (functionName === 'getPosition') {
                    functionResult = await functions[functionName]();
                } else if (functionName === 'getWeather') {
                    functionResult = await functions[functionName](functionArgs.location)
                } else if (functionName === 'fetchAllRoutesToDestination') {
                    const modes = ['driving', 'walking', 'bicycling', 'transit'];
                    const allRoutes = await Promise.all(
                        modes.map(async (mode) => {
                            try {
                                const routeData = await functions[functionName](functionArgs.origin, functionArgs.destination, mode);
                                return {
                                    mode: mode,
                                    route: routeData
                                };
                            } catch (err) {
                                console.error(`Error fetching route for ${mode}:`, err);
                                return null;
                            }
                        })
                    );

                    const locations = allRoutes.flatMap((route) => {
                        const legs = route?.route?.routes[0]?.legs[0];
                        return legs ? [{ title: '路線圖', latitude: legs.end_location.lat, longitude: legs.end_location.lng }] : [];
                    });

                    functionResult = { name: functionName, data: allRoutes, locations };
                } else if (functionName === 'getServices') {
                    functionResult = await functions[functionName](functionArgs.appName);
                    suggestedService = getServiceInfo(functionArgs.appName);
                } else if (functionName === 'findTimeBetweenStation') {
                    functionResult = await functions[functionName](functionArgs.station_1, functionArgs.station_2);
                } else if (functionName === 'getCoordinates') {
                    functionResult = await functions[functionName](functionArgs.location);
                } else if (functionName === 'get_db') {
                    functionResult = await functions[functionName](functionArgs.query);
                }
                else {
                    functionResult = await functions[functionName](functionArgs.k, functionArgs.lat, functionArgs.long);
                }

                const locations = Array.isArray(functionResult) ? functionResult.map(item => ({
                    title: item.title,
                    latitude: item.latitude,
                    longitude: item.longitude,
                })).filter(item => item.title) : [];

                console.log(functionResult);

                // Send function result back to chat model
                const followUpResult = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            ...chatHistory.value.map(chat => ({
                                role: chat.isUser ? 'user' : 'system',
                                content: chat.content
                            })).slice(-5),
                            ...(result.choices[0].message.content != null ? [{ role: 'assistant', content: result.choices[0].message.content }] : []),
                            { role: 'assistant', content: '相關資訊：' + JSON.stringify(functionResult) }
                        ],
                        functions: functionDeclarations, // Pass any function declarations
                        function_call: 'auto',
                    })
                });
                
                const followUpResponse = await followUpResult.json();
                console.log(followUpResponse)
                chatHistory.value.push({

                    id: Date.now(),
                    isUser: false,
                    content: followUpResponse.choices[0].message.content,
                    locations: locations,
                    suggestedService
                });
            }
        } else {
            // No function calls were made
            chatHistory.value.push({ id: Date.now(), isUser: false, content: text, locations: [] });
        }
    } catch (error) {
        console.error('Error sending message:', error);
        chatHistory.value.push({ id: Date.now(), isUser: false, content: 'Sorry, an error occurred. Please try again.', locations: [] });
    } finally {
        loading.value = false;
        await nextTick();
        scrollToBottom();
    }
};

const scrollToBottom = () => {
    if (chatContainer.value) {
        chatContainer.value.scrollTo({
            top: chatContainer.value.scrollHeight,
            behavior: 'smooth'
        });
    }
};

onMounted(() => {
    userName = userStore.user?.realName ?? '';
    console.log(userName);
    const welcomeMessage = `${userName}您好，請問需要什麼服務嗎？`;
    chatHistory.value.push({
        id: Date.now(),
        isUser: false,
        content: welcomeMessage,
        locations: []
    });
    return {
        message: "${welcomeMessage}"
    };
});
</script>

<style>
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

:root {
    --tiffany-blue: #71b2c2;
    --tiffany-blue-dark: #0abab5;
}

.bg-tiffany-blue {
    background-color: var(--tiffany-blue);
}

.text-tiffany-blue {
    color: var(--tiffany-blue);
}

.border-tiffany-blue {
    border-color: var(--tiffany-blue);
}

.hover\:bg-tiffany-blue-dark:hover {
    background-color: var(--tiffany-blue-dark);
}

.focus\:ring-tiffany-blue:focus {
    --tw-ring-color: var(--tiffany-blue);
}

.loader {
    width: 20px;
    height: 20px;
    border: 2px solid #fff;
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
}

@keyframes rotation {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>
