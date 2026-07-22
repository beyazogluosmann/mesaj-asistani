require('dotenv').config();
const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const rate_limit = require('express-rate-limit')
const app = express();

const limiter = rate_limit({                                    
    windowMs: 60 * 1000,
    max: 20,
    message: 'Çok fazla istek gönderdiniz, lütfen 1 dakika bekleyin.'
});

app.use(express.json())
app.use(express.static(__dirname))
app.use(limiter)



const {GoogleGenAI} = require('@google/genai');
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY})

async function scrapeWebsite() {
    try {
        const { data } = await axios.get('https://desicmimarlik.com')
        const $ = cheerio.load(data)
        $('script, style, nav, footer, img').remove()
        const text = $('body').text().replace(/\s+/g, ' ').trim()
        console.log('Website verisi çekildi.')
        return text
    } catch (error) {
        console.log('Scraping başarısız:', error.message)
        return ''
    }
}

let websiteContent = ''
let conversationHistory = [];

const systemInstruction = `
Sen Des İç Mimarlık firmasının müşteri asistanısın. Müşterilere samimi, profesyonel ve yardımsever bir şekilde cevap verirsin.

Firma Bilgileri:
- Firma adı: Des İç Mimarlık
- Website: https://desicmimarlik.com
- Adres: Adnan Kahveci, Kurtuluş Cd. No: 3/2, 34528 Beylikdüzü/İstanbul
- Telefon: 0531 844 34 74
- Çalışma saatleri: 24 saat açık
- Hizmet bölgeleri: Beylikdüzü, Büyükçekmece, Bahçeşehir, Başakşehir, Silivri ve tüm İstanbul

Hizmetler:
- Ev ve Villa Tasarımı: Yaşam alanlarına özel konseptler; malzeme seçimi, mobilya planı ve aydınlatma ile fonksiyonel ve estetik mekanlar.
- Uygulama ve Proje Yönetimi: Tasarımı sahada hayata geçirme; taşeron koordinasyonu, bütçe ve zaman planı ile anahtar teslim teslimat.
- Danışmanlık: İç mimarlık konularında profesyonel danışmanlık hizmeti.
- Peyzaj tasarımı.
- Fuar standı, mağaza, klinik ve showroom tasarımı.
- Ücretsiz ön görüşme imkânı sunulmaktadır.

Tamamlanan Referans Projeler:
- Folkart Nefes Villa (Konut Tasarımı)
- Kubist Park (Villa Tasarımı)
- Demir Country (Rezidans)
- BirBahçe Çekmeköy (Konut Tasarımı)
- Akzirve Strada (Villa Tasarımı)
- Silivri Konut
- Lotus Diş Kliniği

Görevin:
Müşterilere iç mimarlık, tasarım, mobilya seçimi, mekan düzenleme ve firma hakkındaki sorularda yardımcı olmak.
Müşterileri ücretsiz ön görüşmeye davet edebilirsin: 0531 844 34 74
Bu konular dışındaki sorularda nazikçe 'Bu konuda yardımcı olamam, iç mimarlık hakkında sormak istediğiniz bir şey var mı?' dersin.

Cevap stili:
- Cevaplarını kısa ve öz tut, gereksiz uzatma.
- Müşteri daha fazla detay isterse o zaman detay ver.
- 3-4 cümleyi geçme, gerekmedikçe liste yapma.
`;

function getSystemInstruction() {
    return systemInstruction + (websiteContent ? `\nWebsite içeriği:\n${websiteContent}` : '')
}

app.get('/', async (req, res) => {
  const message = req.query.mesaj;
  //console.log(message);

  if(!message) {
     return res.status(400).send('Lütfen bir mesaj giriniz');
  }
   try {
    
    const response = await ai.models.generateContent({
        model : 'gemini-2.0-flash',
        contents: message,
        config: {
            systemInstruction: getSystemInstruction()
        }
    })
    res.send(response.text)
      
   } catch (error) {
     res.send(error.message) 
   }
    
});

app.listen(3000, async () => {
    websiteContent = await scrapeWebsite()
    console.log('Example app listening on port 3000!');
});

app.post('/mesaj', async (req, res)  => {
    const customer_message = req.body.message;
     
    if(!customer_message){
       return res.status(400).send('Lütfen bir mesaj giriniz');
    }

    try {

        conversationHistory.push({
            role: 'user',
            parts: [{text: customer_message}]
        });

        const response = await ai.models.generateContent({
            model:'gemini-2.0-flash',
            contents: conversationHistory,
            config: {
                systemInstruction: getSystemInstruction()
            }

        })
        conversationHistory.push({
            role: 'model',
            parts: [{text: response.text}]
        })
        res.send(response.text)
    } catch (error) {
        res.send(error.message)
    }
     
})

