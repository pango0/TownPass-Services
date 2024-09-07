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
                        <span>
                            {{ location.title }}
                        </span>
                    </div>

                    <iframe class="w-full h-[300px] rounded-lg" height="300" style="border: 0" loading="lazy"
                        allowfullscreen referrerpolicy="no-referrer-when-downgrade"
                        :src="`https://www.google.com/maps/embed/v1/directions?key=AIzaSyCpQnECnOpwD9-XT_Jah9o5qlqBHChW7IU&origin=${userLatitude},${userLongitude}&destination=${location.latitude},${location.longitude}&mode=walking`"></iframe>
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
            <form class="flex items-center" @submit="sendMessage">
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
import { ref, onMounted, nextTick } from 'vue';
import { marked } from 'marked';
import {
    getNearestRentableStation,
    getNearestReturnableStation,
    YouBikeDataWithDistance
} from './youbike';
import { getNearestMetroStation, getTimeBetweenStation, type MetroDataWithDistance } from './metro';
import { getDistance } from './distance';
import { googleSearch } from './search';
import { fetchWeatherData, type BotResponse } from './weather';
import { type TrashCarData, getNearestTrashCarLocations } from './trash';
import { useUserStore } from '../stores/user';
import { getTransitRoute } from './route_planning';
import { getCoordinatesByPlaceName } from './getCoordinates';
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
let origin: string = '';
let destination: string = '';
function fetchOriginDestination(message: string) {
    const originMatch = message.match(/從\s*(\S+)/); // Match after "從"
    const destinationMatch = message.match(/到\s*(\S+)/); // Match after "到"

    origin = originMatch ? originMatch[1] : '';
    destination = destinationMatch ? destinationMatch[1] : '';
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
    }>
>([]);
const loading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);

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

async function getServices(appName: string): Promise<{ text: string; url: string; }> {
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

async function findRentableStation(k: number): Promise<YouBikeDataWithDistance[] | null> {
    try {
        initGeolocation();
        return await getNearestRentableStation(k);
    } catch (error) {
        console.error('Error finding nearest rentable station:', error);
        return null;
    }
}

async function findReturnableStation(k: number): Promise<YouBikeDataWithDistance[] | null> {
    try {
        initGeolocation();
        return await getNearestReturnableStation(k);
    } catch (error) {
        console.error('Error finding nearest returnable station:', error);
        return null;
    }
}

async function findNearestMetroStation(k: number): Promise<MetroDataWithDistance[] | null> {
    try {
        initGeolocation();
        return await getNearestMetroStation(k);
    } catch (error) {
        console.error('Error finding nearest metro station:', error);
        return null;
    }
}

async function findTimeBetweenStation(station_1: string, station_2: string): Promise<any | null> {
    try{
        return await getTimeBetweenStation(station_1, station_2);
    }catch(error){
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
    try{
        return await getCoordinatesByPlaceName(location);
    } catch (error){
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

async function fetchAllRoutesToDestination(message: string): Promise<void> {
    fetchOriginDestination(message);
    loading.value = true;
    try {
        const modes = ['driving', 'walking', 'bicycling', 'transit'];

        const results = await Promise.all(
            modes.map((mode) => getTransitRoute(origin, destination, mode, MapapiKey))
        );

        results.forEach((result, index) => {
            chatHistory.value.push({
                id: Date.now(),
                isUser: false,
                content: `交通方式（${modes[index]}）找到的路線：${JSON.stringify(result.routes)}`,
                locations: []
            });
        });
    } catch (error) {
        console.error('Failed to fetch routes:', error);
    } finally {
        loading.value = false;
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
            "This tool is used to get the kth nearest YouBike station's data where there are available bikes to rent from the user.",
        parameters: {
            type: 'object',
            properties: {
                k: {
                    type: 'number',
                    description: 'This parameter is the number of stations you want to retrieve.'
                }
            },
            required: ['k']
        }
    },
    {
        name: 'findReturnableStation',
        description:
            "This tool is used to get the kth nearest YouBike station's data where there are available vacancies to return the bikes from the user.",
        parameters: {
            type: 'object',
            properties: {
                k: {
                    type: 'number',
                    description: 'This parameter is k.'
                }
            },
            required: ['k']
        }
    },
    {
        name: 'findNearestMetroStation',
        description: "Get the kth nearest Metro station's data, including the distance from the user.",
        parameters: {
            type: 'object',
            properties: {
                k: {
                    type: 'number',
                    description: 'This parameter is the number of stations you want to retrieve.'
                }
            }
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
            'Get the travel time between two metro stations.',
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
        description: 'give the possible route from origin to destination',
        parameters: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: 'This parameter is used for get the complete query message of the user'
                }
            }
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

當使用者的輸入有關這些服務，你就要推薦他服務的網址。
請用繁體中文回答問題.`;
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
                                const routeData = await functions[functionName](query);
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
                } else if(functionName === 'findTimeBetweenStation'){
                    functionResult = await functions[functionName](functionArgs.station_1, functionArgs.station_2);
                }else if(functionName === 'getCoordinates'){
                    functionResult = await functions[functionName](functionArgs.location);
                }
                else {
                    functionResult = await functions[functionName](functionArgs.k);
                }

                const locations = Array.isArray(functionResult) ? functionResult.map(item => ({
                    title: item.title,
                    latitude: item.latitude,
                    longitude: item.longitude,
                })) : [];

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
                    })
                });

                const followUpResponse = await followUpResult.json();
                chatHistory.value.push({
                    id: Date.now(),
                    isUser: false,
                    content: followUpResponse.choices[0].message.content,
                    locations: locations
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
