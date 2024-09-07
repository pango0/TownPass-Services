export interface MetroData {
    StationUID: string;
    StationID: string;
    StationName: {
        Zh_tw: string;
        En: string;
    };
    StationAddress: string;
    BikeAllowOnHoliday: number;
    SrcUpdateTime: string;
    UpdateTime: string;
    VersionID: number;
    StationPosition: {
        PositionLon: number;
        PositionLat: number;
        GeoHash: string;
    };
    LocationCity: string;
    LocationCityCode: string;
    LocationTown: string;
    LocationTownCode: string;
}

export interface MetroS2S{
    StartSID: string,
    EndSID: string,
    StartStationName: string,
    EndStationName: string,
    DeductedFare: number,
    Discount60: number,
    Discount40: number,
    Lang: string
}



export interface MetroDataWithDistance extends MetroData{
    distance: number;
    latitude: number;
    longitude: number;
    title: string;
}

let userLatitude: number | null = null;
let userLongitude: number | null = null;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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

export async function fetchMetroData(lat:number, long:number): Promise<MetroDataWithDistance[]> {
    const url = 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Station/TRTC';

    try {
        // await initGeolocation();

        // if (userLatitude === null || userLongitude === null) {
        //     throw new Error("Unable to get user location");
        // }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data: MetroData[] = await response.json();

        const dataWithDistance: MetroDataWithDistance[] = data.map(station => ({
            ...station,
            distance: getDistance(lat!, long!, station.StationPosition.PositionLat, station.StationPosition.PositionLon),
            latitude: station.StationPosition.PositionLat,
            longitude: station.StationPosition.PositionLon,
            title: station.StationName.Zh_tw,
        }));
        return dataWithDistance
    } catch (error) {
        console.error('Failed to fetch or parse data:', error);
        return [];
    }
}

export async function getNearestMetroStation(k: number, lat:number, long:number): Promise<(MetroDataWithDistance)[] | null> {
    try {
        const stations = await fetchMetroData(lat, long);

        if (stations.length === 0) {
            return null;
        }

        const sortedStations = stations.sort((a, b) => a.distance - b.distance);

        return sortedStations.slice(0, k);
    } catch (error) {
        console.error('Error finding nearest returnable station:', error);
        return null;
    }
}

function mapping(input: string,){
    const stationMap: { [key: string]: string } = {
        "請選擇車站：": "none",
        "動物園": "019",
        "木柵": "018",
        "萬芳社區": "017",
        "萬芳醫院": "016",
        "辛亥": "015",
        "麟光": "014",
        "六張犁": "013",
        "科技大樓": "012",
        "大安": "011",
        "忠孝復興": "010",
        "南京復興": "009",
        "中山國中": "008",
        "松山機場": "007",
        "大直": "021",
        "劍南路": "022",
        "西湖": "023",
        "港墘": "024",
        "文德": "025",
        "內湖": "026",
        "大湖公園": "027",
        "葫洲": "028",
        "東湖": "029",
        "南港軟體園區": "030",
        "南港展覽館": "031",
        "象山": "099",
        "台北101/世貿": "100",
        "信義安和": "101",
        "大安森林公園": "103",
        "東門": "134",
        "中正紀念堂": "042",
        "台大醫院": "050",
        "台北車站": "051",
        "中山": "053",
        "雙連": "054",
        "民權西路": "055",
        "圓山": "056",
        "劍潭": "057",
        "士林": "058",
        "芝山": "059",
        "明德": "060",
        "石牌": "061",
        "唭哩岸": "062",
        "奇岩": "063",
        "北投": "064",
        "新北投": "065",
        "復興崗": "066",
        "忠義": "067",
        "關渡": "068",
        "竹圍": "069",
        "紅樹林": "070",
        "淡水": "071",
        "新店": "033",
        "新店區公所": "034",
        "七張": "035",
        "小碧潭": "032",
        "大坪林": "036",
        "景美": "037",
        "萬隆": "038",
        "公館": "039",
        "台電大樓": "040",
        "古亭": "041",
        "小南門": "043",
        "西門": "086",
        "北門": "105",
        "松江南京": "132",
        "台北小巨蛋": "109",
        "南京三民": "110",
        "松山": "111",
        "南勢角": "048",
        "景安": "047",
        "永安市場": "046",
        "頂溪": "045",
        "忠孝新生": "089",
        "行天宮": "131",
        "中山國小": "130",
        "大橋頭": "128",
        "台北橋": "127",
        "菜寮": "126",
        "三重": "125",
        "先嗇宮": "124",
        "頭前庄": "123",
        "新莊": "122",
        "輔大": "121",
        "丹鳳": "180",
        "迴龍": "179",
        "三重國小": "178",
        "三和國中": "177",
        "徐匯中學": "176",
        "三民高中": "175",
        "蘆洲": "174",
        "頂埔": "076",
        "永寧": "077",
        "土城": "078",
        "海山": "079",
        "亞東醫院": "080",
        "府中": "081",
        "板橋": "082",
        "新埔": "083",
        "江子翠": "084",
        "龍山寺": "085",
        "善導寺": "088",
        "忠孝敦化": "091",
        "國父紀念館": "092",
        "市政府": "093",
        "永春": "094",
        "後山埤": "095",
        "昆陽": "096",
        "南港": "097",
        "十四張": "201",
        "秀朗橋": "202",
        "景平": "203",
        "中和": "205",
        "橋和": "206",
        "中原": "207",
        "板新": "208",
        "新埔民生": "210",
        "幸福": "212",
        "新北產業園區": "213"
    };
    for (const station in stationMap) {
        if (input.includes(station)) {
            return stationMap[station]; // Return the station code (value) if found
        }
    }
    return null
}


export async function getTimeBetweenStation(station_1: string, station_2: string): Promise<MetroS2S | null> {
    const id_1 = mapping(station_1)
    const id_2 = mapping(station_2)
    try {

        const response = await fetch(`http://localhost:3000/metro?StartSID=${id_1}&EndSID=${id_2}&Lang=tw`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data; // Return the data to be used later

    } catch (error) {
        console.error("Error:", error);
        throw error; // Rethrow the error so the caller can handle it
    }
}


