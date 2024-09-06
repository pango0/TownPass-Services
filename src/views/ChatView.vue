<!-- eslint-disable prettier-vue/prettier -->
<!-- eslint-disable prettier-vue/prettier -->
<template>
    <div class="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <!-- <header class="flex justify-between items-center bg-white p-4">
            <h1 class="text-3xl font-bold text-tiffany-blue"></h1>
            <router-link to="/settings" class="text-[#71b2c2] hover:text-tiffany-blue">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </router-link>
        </header> -->
        <div class="flex-grow overflow-y-auto p-4 space-y-4" ref="chatContainer">
            <div v-for="message in chatHistory" :key="message.id" class="p-3 rounded-lg"
                :class="message.isUser ? 'bg-tiffany-blue text-white' : 'bg-gray-100'">
                <p class="font-semibold">{{ message.isUser ? '你' : '人工智慧助理' }}:</p>
                <div v-if="message.isUser" class="mt-1">{{ message.content }}</div>
                <div v-else v-html="renderMarkdown(message.content)" class="mt-1 prose prose-sm max-w-none"></div>
                <div v-for="location in message.locations" :key="location.latitude" style="padding: 12px">
                    <div>
                        <span v-if="location.functionName === 'findNearestMetroStation'">捷運地圖：</span>
                        <span
                            v-else-if="location.functionName === 'findReturnableStation' || location.functionName === 'findRentableStation'">YouBike地圖：</span>
                    </div>


                    <iframe class="w-full h-[300px] rounded-lg" height="300" style="border:0" loading="lazy"
                        allowfullscreen referrerpolicy="no-referrer-when-downgrade"
                        :src="`https://www.google.com/maps/embed/v1/directions?key=AIzaSyCpQnECnOpwD9-XT_Jah9o5qlqBHChW7IU
    &origin=${userLatitude},${userLongitude}&destination=${location.latitude},${location.longitude}&mode=walking`"></iframe>
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


<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from 'marked';
import { getNearestRentableStation, getNearestReturnableStation, YouBikeDataWithDistance } from './youbike';
import { getNearestMetroStation, MetroDataWithDistance } from './metro';
import { getDistance } from './distance'
import { googleSearch } from './search';
import { fetchWeatherData, WeatherForecast } from './weather';
let userLatitude: number | null = null;
let userLongitude: number | null = null;

const commonQueries = ref([
    "附近有哪裡可以租YouBike？",
    "附近有哪裡可以還YouBike？",
    "最近的捷運站在哪裡？",
    "台北市有哪些景點推薦？",
    "今天天氣如何？"
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
            reject(new Error("Geolocation is not supported by this browser."));
        }
    });
}

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
const userInput = ref('');
const chatHistory = ref<Array<{
    id: number;
    isUser: boolean;
    content: string;
    locations: Array<{
        functionName: string;
        latitude: number;
        longitude: number;
    }>;
}>>([]);
const loading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
async function fetchWeatherData(locationName: string): Promise<BotResponse> {
    const locationWeatherUrls: { [key: string]: string } = {

        "大安區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%A4%A7%E5%AE%89%E5%8D%80&elementName=WeatherDescription',
        "中正區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E4%B8%AD%E6%AD%A3%E5%8D%80&elementName=WeatherDescription',
        "北投區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%8C%97%E6%8A%95%E5%8D%80&elementName=WeatherDescription',
        "士林區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%A3%AB%E6%9E%97%E5%8D%80&elementName=WeatherDescription',
        "內湖區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%85%A7%E6%B9%96%E5%8D%80&elementName=WeatherDescription',
        "中山區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E4%B8%AD%E5%B1%B1%E5%8D%80&elementName=WeatherDescription',
        "大同區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%A4%A7%E5%90%8C%E5%8D%80&elementName=WeatherDescription',
        "松山區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E6%9D%BE%E5%B1%B1%E5%8D%80&elementName=WeatherDescription',
        "南港區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E5%8D%97%E6%B8%AF%E5%8D%80&elementName=WeatherDescription',
        "萬華區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E8%90%AC%E8%8F%AF%E5%8D%80&elementName=WeatherDescription',
        "信義區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E4%BF%A1%E7%BE%A9%E5%8D%80&elementName=WeatherDescription',
        "文山區": 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-061?Authorization=CWA-EC987A54-DB8B-4E1A-AD8E-C775D2258D57&locationName=%E6%96%87%E5%B1%B1%E5%8D%80&elementName=WeatherDescription'
        // Your URL mappings...
    };

    const weatherUrl = locationWeatherUrls[locationName];
    if (!weatherUrl) {
        return {
            message: `Sorry, I couldn't find weather data for the location: ${locationName}.`
        };
    }

    try {
        const response = await fetch(weatherUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data: WeatherForecast = await response.json();

        const weatherDetails = data.records.locations.map((locationSet) => {
            return locationSet.location.map((location) => {
                const weatherElement = location.weatherElement.find(
                    (element) => element.elementName === 'WeatherDescription'
                );

                const forecastTimes = weatherElement?.time.map((time) => {
                    const startTime = time.startTime;
                    const endTime = time.endTime;
                    const weatherDescription = time.elementValue[0].value;

                    return `From ${startTime} to ${endTime}, the weather in ${locationName} is expected to be: ${weatherDescription}.`;
                });

                return forecastTimes?.join('\n') || `No weather data available for ${locationName}.`;
            }).join('\n');
        }).join('\n');

        return {
            message: weatherDetails,
            data: data
        };
    } catch (error) {
        console.error('Failed to fetch or process weather data:', error);
        return {
            message: 'Sorry, I could not fetch the weather data. Please try again later.'
        };
    }
}




console.log(fetchWeatherData("大安區"))

async function findRentableStation(): Promise<YouBikeDataWithDistance | null> {
    try {
        initGeolocation()
        return await getNearestRentableStation(k);
    } catch (error) {
        console.error("Error finding nearest rentable station:", error);
        return null;
    }
}

async function findReturnableStation(k: number): Promise<YouBikeDataWithDistance[] | null> {
    try {
        initGeolocation()
        return await getNearestReturnableStation(k);
    } catch (error) {
        console.error("Error finding nearest returnable station:", error);
        return null;
    }
}

async function findNearestMetroStation(k: number): Promise<MetroDataWithDistance[]> {
    try {
        initGeolocation()
        return await getNearestMetroStation(k);
    } catch (error) {
        console.error("Error finding nearest metro station:", error);
        return null;
    }
}

async function findDistance(lat1: number, lon1: number): Promise<any | null> {
    try {
        initGeolocation()
        return await getDistance(lat1, lon1, userLatitude, userLongitude);
    } catch (error) {
        console.error("Error finding nearest metro station:", error);
        return null;
    }
}

async function searchGoogle(query: string): Promise<any | null> {
    try {
        return await googleSearch(query);
    } catch (error) {
        console.error("Error searching Google:", error);
        return null;
    }
}
const functionDeclarations = [
    {
        name: "fetchWeatherData",
        description: "Get the current weather forecast, including temperature and condition.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "This query is the location where the user wants to know the weather about. Please note that it is in traditional chinese."
                }
            }
        }
    },
    {
        name: "findRentableStation",
        description: "Get the kth nearest YouBike station's data where there are available bikes to rent, including the distance from the user.",
        parameters: {
            type: "object", properties: {
                k: {
                    type: "number",
                    description: "This parameter is k."
                }
            },
            required: ["k"]
        }
    },
    {
        name: "findReturnableStation",
        description: "Get the kth nearest YouBike station's data where there are available vacancies to return the bikes, including the distance from the user.",
        parameters: {
            type: "object", properties: {
                k: {
                    type: "number",
                    description: "This parameter is k."
                }
            },
            required: ["k"]
        }
    },
    {
        name: "findNearestMetroStation",
        description: "Get the kth nearest Metro station's data, including the distance from the user.",
        parameters: {
            type: "object", properties: {
                k: {
                    type: "number",
                    description: "This parameter is k."
                }
            },
            required: ["k"]
        }
    },
    // {
    //     name: "findDistance",
    //     description: "This tool can retrieve the distance between a location and the user.",
    //     parameters: {
    //         type: "object", properties: {
    //             lat1: {
    //                 type: "number",
    //                 description: "This parameter is the latitude of the location"
    //             },
    //             lon1: {
    //                 type: "number",
    //                 description: "This parameter is the longitude of the location"
    //             }
    //         }
    //     }
    // },
    {
        name: "searchGoogle",
        description: "Tool to obtain information you don't already know.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query you want to use"
                }
            },
            required: ["query"]
        }
    }
];

const functions = {
    findRentableStation,
    findReturnableStation,
    findNearestMetroStation,
    // findDistance
    searchGoogle,
    fetchWeatherData,
};

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: "You answer questions in traditional chinese" });
const chat = model.startChat({ tools: [{ functionDeclarations }] });

const renderMarkdown = (text: string) => {
    return marked(text);
};

const sendMessage = async () => {
    if (userInput.value.trim() === '') return;

    loading.value = true;
    chatHistory.value.push({ id: Date.now(), isUser: true, content: userInput.value });
    const query = userInput.value;
    userInput.value = '';
    await nextTick();
    scrollToBottom();

    try {
        const result = await chat.sendMessage(query);
        const aiResponse = result.response;
        const text = aiResponse.text();
        const functionCalls = aiResponse.functionCalls();
        console.log(text)
        console.log(functionCalls)
        console.log(aiResponse.usageMetadata);
        if (functionCalls && functionCalls.length > 0) {
            const functionResults = await Promise.all(functionCalls.map(async (call) => {
                if (call.name in functions) {
                    console.log(call.name)
                    if (call.name === 'searchGoogle') {
                        const query = call.args['query'];
                        if (query) {
                            const data = await functions[call.name](query);
                            return {
                                name: call.name,
                                data: data,
                                location: null
                            };
                        }
                    } else {
                        console.log(call.args)
                        const data = await functions[call.name as keyof typeof functions](call.args['k']);
                        console.log(data)
                        return {
                            name: call.name,
                            data: data,
                            location: (data.latitude !== undefined && data.longitude !== undefined) ? {
                                functionName: call.name,
                                latitude: data.latitude,
                                longitude: data.longitude,
                            } : null,
                        };
                    }
                }
                return null;
            }));

            const validResults = functionResults
                .filter((result): result is {
                    name: string;
                    data: any;
                    location: {
                        functionName: string;
                        latitude: number;
                        longitude: number;
                    } | null
                } => result !== null);


            if (validResults.length > 0) {
                const followUpResult = await chat.sendMessage(JSON.stringify(validResults));
                chatHistory.value.push({
                    id: Date.now(),
                    isUser: false,
                    content: followUpResult.response.text(),
                    locations: validResults
                        .filter(res => res.location !== null)
                        .map(res => res.location as { latitude: number; longitude: number }),
                });
            } else {
                // console.log("no tools used")
                chatHistory.value.push({ id: Date.now(), isUser: false, content: text, locations: [] });
            }
        } else {
            console.log("no tools used")

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
    scrollToBottom();
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
    border: 2px solid #FFF;
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