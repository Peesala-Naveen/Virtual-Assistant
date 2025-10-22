import axios from 'axios';
const geminiResponse = async (command, userName, assistantName) => {
    try {
        const apiUrl = process.env.GEMINI_API_URL;
        const prompt = `You are a virtual Assistant named ${assistantName} created by ${userName}
        You are not Google You will now behave like a voice assistant .
        Your task is to understant the user's natural language input and respond with a JSON object like this:
        {
        "type": "general" | "google_search" | "youtube_search" | "youtube_play" |
        "calculator_open" | "open_instagram" | "open_facebook" | "show_weather" |
    ]   "get_time" | "get_date" | "get_day" | "get_month" | "get_year"
         "userInput": "<original user input>"{only remove your name from userinput if exists} and agar kisi ne google ya youtube pe kuch search karna ko bola hai to userinput ne only vo search boola text jaye,
         "response": "<a short spoken response to read out loud to the user>"
        }
         Instructions:
         "type":determine the intent of the user.
         "userInput":original sentence the user spoken.
         "response":A short response to the user voice-friendly based on the intent.
         
         "Type Meaning":
         ""general":for general queries and conversations.aur agar koi aisa question puchtha hai jiska answer tume patha hai usko bhi general category me rakho bas short answer dena.
         "google_search":when user wants to search something on google.
         "youtube_search":when user wants to search something on youtube.
         youtube_play":when user wants to play a specific video on youtube.
         "get_time":when user wants to know the current time.
         "get_date":when user wants to know today's date.
         "get_day":when user wants to know the current day of the week.
         "get_month":when user wants to know the current month.
         "get_year":when user wants to know the current year.
         "calculator_open":when user wants to open calculator app.
         "instagram_open":when user wants to open instagram app.
         "facebook_open":when user wants to open facebook app.
         "weather_show":when user wants to know the weather forecast.
         
         Important Notes:
         use ${assistantName} agar koi pucha tumm ne kissi ne banaya hai to.
         Use ${userName} as the user's name in your responses.
         Only respond with the JSON object and nothing else.

         now your userInput is : ${command} `;



        const result = await axios
            .post(apiUrl, {
                "contents": [      //taken from gemini api docs
                    {
                        "role": "user",
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            })
        return result.data.candidates[0].content.parts[0].text;

    } catch (error) {
        // concise error logging: status and message only
        if (error?.response) {
            console.error('geminiResponse HTTP error', error.response.status, error.response.statusText);
        } else {
            console.error('geminiResponse error:', error?.message || error);
        }
    }
}
export default geminiResponse;