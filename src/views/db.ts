import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";

export async function query_db(query: string) : Promise<(Document|null)[]>{
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not set in environment variables");
    }

    // Split the input string into smaller chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 70,  // Adjust this size based on your needs
        chunkOverlap: 10, // Adjust the overlap based on your use case
    });
    const inputString: string = '一定需要實名認證才能加入台北通會員？ Does signing up for TaipeiPASS membership require real name verification ? 台北通會員分為一般會員與金質會員（實名認證會員），建議您申請金質會員享有完整服務。一個人可以註冊幾個台北通金質會員？How many TaipeiPASS City membership can an individual register for? 台北通金質會員是經過身分認證的會員帳號，一個人只會有一組身分證號碼，故每人僅能註冊一個台北通金質會員。已透過市民服務大平台或身分驗證申請註冊加入會員，超過時間沒有收到審核通知，怎麼辦？ What should I do if I applied for membership through Citizen Grand Platform or Identity Verification Procedure but have not received the results of evaluation by the expected deadline ? 請透過登入市民服務大平台 - 線上進度查詢服務進度，或致電客服(1999外縣市02 - 27208889)轉8585。身分證驗證：致電客服(1999外縣市02 - 27208889)轉8585。已透過悠遊付註冊台北通會員，請問如何登入？ I have signed up for EasyWallet.How do I log in? 透過悠遊付APP註冊完成的台北通會員將取得一組帳號及密碼，如您忘記當初設定的密碼，請透過「忘記密碼」功能進行密碼變更。什麼是快速登入？什麼是圖形登入？如何在台北通APP設定？ What is Fast Login ? What is Graphic Login ? How can I set up these options ? 台北通為提供便利的登入方式，可於APP上以生物識別（指紋、臉部辨識）啟用快速登入，或透過圖形密碼進行登入。您可以點擊APP左側上方的人像圖示開啟側欄選單，再點選齒輪符號進入設定，詳請參考操作步驟。手機門號註冊的認證過程會出現「驗證是否為裝置持有者」代表什麼意思？ During registration, there is a message "Verify if you are the owner of the device." What does this mean ? 手機門號驗證係透過手機sim卡與電信公司進行身分驗證，註冊不會寄送任何認證碼或簡訊。​認證過程會出現「驗證是否為裝置持有者」，請依平常習慣解鎖手機即可，例如輸入密碼、指紋或畫出圖形等。手機門號驗證出現身分證字號正確，生日錯誤的錯誤訊息。這是什麼意思 ? During mobile phone verification, it says that my ID number is correct but my birth date info is wrong.What does this mean ? 出現此錯誤訊息，多數是您留存於電信公司的生日資料有錯誤或缺漏。請您先致電電信公司客服查詢相關會員資料。若和電信公司比對資料無誤，請您來電1999(外縣市02 - 27208889)轉8585將有專人為您服務。手機是雙卡機可以註冊嗎？ Can I register with a dual - SIM card mobile phone ? 請先確認：1.用來認證的sim卡裝在卡槽12.透過卡槽1上網3.輸入卡槽1的sim卡資料，如資料皆符合但仍無法進行，請先直接關閉卡槽2功能（或取出卡2）再試試看註冊，註冊完成可再放回去，並不影響後續登入功能。可以透過手機門號認證的電信業者包括哪些？ Which telecom operators qualify for mobile phone number verification ? 電信業者：中華、遠傳、台灣大哥大皆可以做手機門號認證。只有臺北市民才能申辦台北通嗎？ Is TaipeiPASS application limited to only citizens of Taipei ? 台北通會員不限於臺北市市民申請，也歡迎非市民申請，但各服務提供對象則依各自規定辦理。忘記密碼 - 手機STEP 1.點選忘記密碼STEP 2.輸入手機號碼STEP 3.取得驗證碼後於對應欄位輸入。STEP 4.重設密碼STEP 5.設定成功，請持新的密碼登入即可。帳號登入STEP 1.輸入帳號密碼，點選登入STEP 2.登入成功快速 / 圖形登入設定STEP 1.登入後點選左上角按鈕STEP 2.點選設定STEP 3.開啟快速登入或圖形登入忘記密碼 - emailSTEP 1.點選忘記密碼STEP 2.輸入e - mailSTEP 3.驗證訊息已送出，請至信箱點選連結回到台北通APP輸入驗證碼。STEP 5.重設密碼修改密碼STEP 1.登入後於左上角點選"人像"STEP 2.並點選"齒輪"做設定STEP 3.點選修改密碼STEP 4.輸入原密碼。若您有開啟生物辨識或圖形登入會以此方式驗證。若未開啟需輸入登入密碼輸入原密碼。若您有開啟生物辨識或圖形登入會以此方式驗證。若未開啟需輸入登入密碼STEP 5.輸入新密碼可以重複領取同一特約商店的優惠券嗎？Can I repeatedly collect coupons from the same partner store ? 優惠券說明頁顯示「無數量限制」即表示不限領取及使用次數，優惠活動期間內，可以重複領取與使用。如何使用優惠券？How can I access the coupons ? 在台北通特約商家消費時，出示APP優惠券畫面即可享有專屬優惠。超簡單使用方式，請參考操作步驟。如何知道商店是否為特約商店？ How can I tell if a store is a partner store of TaipeiPASS ? 每間店都有台北通廣宣物「窗貼1份及櫃台跳卡1份」，特約商店會於活動期間內佈置擺放完成，以利會員辨認。如何獲得優惠券？ How can I obtain the discount coupons ? 下載台北通App，方能使用優惠，點選「優惠」主題，點選「優惠券」即可查看所有優惠商家。看到喜歡的優惠，可以按「+我的票夾」領取優惠或直接點立即使用票券。詳細操作請查看操作步驟領取的優惠券是否可以取消？Can I delete the coupons I\'ve claimed?優惠券領取後，若不想使用不需要取消，沒用到的優惠券超過使用期限便會自動失效，優惠期間內可以重複領取想要的店家優惠。優惠券是否有領取上限？ Is there a cap on the coupons you can stock?優惠券沒有限制領取次數，在優惠活動期間內隨時都可以任一店家領取並使用。優惠券需要核銷嗎？ Do I need to activate the coupons to use them?消費使用後，結帳時需打開優惠券並點選「立即使用」作為核銷，點擊我的票夾進入「已兌換」區可看到已使用的票券。台北通帳號授權使用市府其他數位平台，可以取消使用授權嗎？ I\'ve authorized my TaipeiPASS account to access other digital platforms of the city government.Can I cancel the authorization ? 請您登入台北通官方網站https ://id.taipei/tpcd/login，就可以在會員中心的「安全性」-「授權第三方應用」列表中，選擇取消特定服務的授權。如何取消訂閱? How can I cancel my subscriptions?台北通為本府訊息揭露管道之一，會接受本府各機關訊息推播的需求。 若未來不希望接收到推播，您也可以透過以下路徑做關閉(左上角人像>齒輪>關閉訊息通知提醒)健康點數如何獲得與使用？ How do I earn and use Health Points?臺北市政府衛生局為使市民參與公共衛生預防保健篩檢服務，自103年度起凡設籍或非設籍臺北市之民眾，持自有悠遊卡者均可申辦成為「台北通」。為持續加強公共衛生服務，113年賡續規劃辦理「台北通-健康服務」集點兌點服務，鼓勵市民積極參與篩檢累積健康點數，並回饋市民兌換悠遊卡加值金，以強化市民自我健康管理，提升健康識能及促進健康！（最新各項集點活動期間請參閱集點活動公告：臺北市政府衛生局「台北通-健康服務https://health.gov.taipei/cp.aspx?n=26653F529068AB04&s=C455D38F26C2F3D6」專區）剛完成停車費繳納，台北通的帳單紀錄為何沒有顯示紀錄？ I just paid my parking fee, but why isn\'t the paid bill displayed in the records?停車費帳單及繳納資訊非立即更新，請以停管處回覆之即時結果為準。如有繳費問題請逕洽停管處客服 02-2726-9600。台北通建議使用環境？使用行動裝置有哪些？What are the specs and requirment for TaipeiPASS app? What mobile devices can I install it on?台北通APP目前提供Android與iOS系統兩個版本，安裝前請先確認智慧型手機之作業系統規格，目前支援 iOS 13.0以上(含)及Android 7.0以上(含)。無法更新台北通APP怎麼辦？I can\'t update my TaipeiPASS to the latest version! What can I do?台北通APP在Google Play及App Store皆可以下載、更新。若出現：1.「開啟台北通APP出現更新APP的提示，但點選前往更新，卻沒有看到更新按鈕」的狀況：請重新於Google Play或App Store搜尋「台北通」，出現「更新」即可點選更新。若仍看不到「更新」則有可能是平台還在逐步推送更新，依每個使用者更新的速度不太一樣，建議您稍晚再更新看看。2.「開啟台北通APP出現更新APP的提示，但點選前往更新並完成更新後，回到APP又被要求更新」的狀況：當您在Google Play或App Store可以搜尋到最新版本時，請再點選更新。什麼是台北通？台北通為了滿足市民對美好生活、臺北智慧城市的想像，臺北市政府將個人身份識別結合多項市政服務， 打造 【台北通TaipeiPASS】，除了是開啟服務的入口，更是專屬臺北市的數位身份識別， 連結每位臺北市民與政府，讓市民服務更加貼近市民生活，以智慧臺北實現城市幸福感。台北通作為臺北市政府會員單一入口，整合貼近民眾生活的市政便民服務與資源， 建立市民數位ID與認證機制，並連接各項線上與線下服務， 提供市民在各項生活應用上便利的識別及支付工具。 加入台北通的會員即可享有臺北市政府提供的服務，台北通成為市民開啟市府服務的鑰匙。'
    // Create document format for the string

    const docs = [new Document({ pageContent: inputString, metadata: {} })];
    const splits = await textSplitter.splitDocuments(docs);
    // console.log(splits)
    // Generate embeddings for the split documents
    const vectorStore = await MemoryVectorStore.fromDocuments(
        splits,
        new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY })
    );

    // You can now query the vector store
    const retriever = vectorStore.asRetriever({ k: 6, searchType: "similarity" });
    const results = await retriever.invoke(query);
    console.log(results)
    return results; 
}
