<template>
  <div
    class="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
  >
    <header class="flex justify-between items-center bg-white p-4">
      <h1 class="text-3xl font-bold text-tiffany-blue">人工智慧助理</h1>
      <router-link to="/settings" class="text-[#71b2c2] hover:text-tiffany-blue">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </router-link>
    </header>
    <div class="flex-grow overflow-y-auto p-4 space-y-4" ref="chatContainer">
      <div
        v-for="message in chatHistory"
        :key="message.id"
        class="p-3 rounded-lg"
        :class="message.isUser ? 'bg-tiffany-blue text-white' : 'bg-gray-100'"
      >
        <p class="font-semibold">{{ message.isUser ? '你' : '人工智慧助理' }}:</p>
        <div v-if="message.isUser" class="mt-1">{{ message.content }}</div>
        <div
          v-else
          v-html="renderMarkdown(message.content)"
          class="mt-1 prose prose-sm max-w-none"
        ></div>
        <div v-for="location in message.locations" :key="location.latitude" style="padding: 12px">
          <div>
            <span v-if="location.functionName === 'findNearestMetroStation'">捷運地圖：</span>
            <span
              v-else-if="
                location.functionName === 'findReturnableStation' ||
                location.functionName === 'findRentableStation'
              "
            >
              YouBike地圖：
            </span>
          </div>

          <iframe
            class="w-full h-[300px] rounded-lg"
            height="300"
            style="border: 0"
            loading="lazy"
            allowfullscreen
            referrerpolicy="no-referrer-when-downgrade"
            :src="`https://www.google.com/maps/embed/v1/directions?key=AIzaSyCpQnECnOpwD9-XT_Jah9o5qlqBHChW7IU
    &origin=${userLatitude},${userLongitude}&destination=${location.latitude},${location.longitude}&mode=walking`"
          ></iframe>
        </div>
      </div>
    </div>
    <div class="p-4 bg-white border-t border-gray-200">
      <div class="overflow-x-auto whitespace-nowrap mb-4">
        <button
          v-for="query in commonQueries"
          :key="query"
          @click="sendCommonQuery(query)"
          class="inline-block px-3 py-1 mr-2 text-sm bg-white-200 text-gray-700 rounded-full border border-[#0abab5] hover:bg-gray-300 transition-colors"
        >
          {{ query }}
        </button>
      </div>
      <div class="flex items-center">
        <input
          v-model="userInput"
          @keyup.enter="sendMessage"
          :disabled="loading"
          class="flex-grow h-10 px-4 border border-tiffany-blue rounded-full focus:outline-none focus:ring-2 focus:ring-tiffany-blue"
          placeholder="輸入你的問題"
        />
        <button
          @click="sendMessage"
          :disabled="loading"
          class="ml-2 bg-tiffany-blue text-white h-10 w-10 rounded-full hover:bg-tiffany-blue-dark transition-colors flex items-center justify-center"
        >
          <template v-if="loading">
            <span class="loader"></span>
          </template>
          <template v-else>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 transform rotate-90"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
              />
            </svg>
          </template>
        </button>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { marked } from 'marked';
import {
    getNearestRentableStation,
    getNearestReturnableStation,
    YouBikeDataWithDistance
} from './youbike';
import { getNearestMetroStation, type MetroDataWithDistance } from './metro';
import { getDistance } from './distance';
import { googleSearch } from './search';
import { fetchWeatherData, type BotResponse } from './weather';
import { type TrashCarData, getNearestTrashCarLocations } from './trash';
import { fetchMetroGraphData, dijkstra, buildGraph, type Route } from './metroS2S';
import { useUserStore } from '../stores/user';
import { getTransitRoute } from './route_planning';
const userStore = useUserStore();
let userName = 'Guest';

let userLatitude: number | null = null;
let userLongitude: number | null = null;

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

const MapapiKey = 'AIzaSyDd0sVXtX4MCYSbXwA6Tx5dVRAhk-_HYJQ';

const userInput = ref('');
const chatHistory = ref<
  Array<{
    id: number;
    isUser: boolean;
    content: string;
    locations: Array<{
      functionName: string;
      latitude: number;
      longitude: number;
    }>;
  }>
>([]);
const loading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);

async function getWeather(): Promise<BotResponse> {
  // Replace with actual weather API URL
  try {
    initGeolocation();
    return await fetchWeatherData();
  } catch (error) {
    console.error('Error fetching weather:', error);
    return {
      message: "Sorry, I couldn't fetch the weather data."
    };
  }
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

async function findDistance(lat1: number, lon1: number): Promise<any | null> {
  try {
    initGeolocation();
    return await getDistance(lat1, lon1, userLatitude, userLongitude);
  } catch (error) {
    console.error('Error finding nearest metro station:', error);
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
    await initGeolocation();
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
    chatHistory.value.push({
      id: Date.now(),
      isUser: false,
      content: '取得路徑時發生錯誤，請稍後再試。',
      locations: []
    });
  } finally {
    loading.value = false;
  }
}

const functionDeclarations = [
    {
        name: 'getWeather',
        description: 'This tool is used to get the current weather forecast, including temperature and condition.',
        parameters: {
            type: 'object',
            properties: {
                k: {
                    type: 'string',
                    description: 'This parameter is not used but is required by the API.'
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
    }
];

const functions = {
  findRentableStation,
  findReturnableStation,
  findNearestMetroStation,
  // findDistance
  searchGoogle,
  getWeather,
  findTrashCarLocation,
  fetchAllRoutesToDestination
};

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

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
    console.log(query)
    try {
        // Prepare the payload for OpenAI API
        const messages = [
            { role: 'system', content: '你是一位台北市的助理，你叫做"台北通智慧助理". 請用繁體中文回答問題. ' },
            { role: 'user', content: query }
        ];

        const body = {
            model: 'gpt-4o',
            messages: messages,
            functions: functionDeclarations, // Pass any function declarations
            function_call: 'auto', // Let the model decide when to call a function
            // stream: true,
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
        console.log('response',response)
        const result = await response.json();
        console.log('result',result)
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
                } else if (functionName === 'fetchAllRoutesToDestination') {
                  const modes = ['driving', 'walking', 'bicycling', 'transit'];
                  const allRoutes = await Promise.all(
                    modes.map(async (mode) => {
                      const routeData = await functions[functionName](query);
                      return {
                        mode: mode,
                        route: routeData
                      };
                    })
                  );

                  // Construct locations based on the routes
                  const locations = allRoutes.flatMap((route) => {
                    const legs = route.route?.routes[0]?.legs[0];
                    return legs
                      ? [
                          {
                            functionName,
                            latitude: legs.end_location.lat,
                            longitude: legs.end_location.lng
                          }
                        ]
                      : [];
                  });

                  functionResult = { name: functionName, data: allRoutes, locations };

                }  
                else {
                    functionResult = await functions[functionName](functionArgs.k);
                }

                const locations = Array.isArray(functionResult) ? functionResult.map(item => ({
                    functionName,
                    latitude: item.latitude,
                    longitude: item.longitude,
                })) : [];

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
                            { role: 'assistant', content: query+JSON.stringify(functionResult)+'請用繁體中文回答' }
                        ],
                    //     stream: true,
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
  return{
    message:"${welcomeMessage}"
  };
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
