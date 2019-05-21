"use strict";

const functions = require("firebase-functions");
const {
    dialogflow,
    Suggestions,
    RegisterUpdate,
    UpdatePermission
} = require("actions-on-google");


// Prepare SDK usage
const app = dialogflow({
    debug: true
});
const getNews = (start, end) => {
    return [
        {
            created: new Date("2019-05-17T09:00:00+0900"),
            contents: "It will rain from evening."
        },
        {
            created: new Date("2019-05-17T22:30:00+0900"),
            contents: "A JavaScript study session will be held inside the company from 10 am on the 19th tomorrow. Please join us."
        },
        {
            created: new Date("2019-05-16T10:00:00+0900"),
            contents: "The number of users finally exceeded 100 million!"
        }
    ].filter(x => {
        // Limit news by the specific span
        return (start <= x.created.getTime()) && (x.created.getTime() <= end);
    }).sort((a, b) => {
        // Sort news by the created
        return a.created.getTime() - b.created.getTime();
    }).map(x => {
        // Return contents only
        return x.contents;
    });
};
const reply = (conv, message) => {
    conv.ask(message);
    conv.ask(new Suggestions([
        "Enviar diario", "Enviar en tiempo real",
        "Últimas noticias", "Noticias recientes", "Noticias de ayer"
    ]));
};
app.intent("Default Welcome Intent", conv => {
    conv.ask("Te cuento noticias diarias. ¿Cuándo quieres saber las noticias?");
    conv.ask(new Suggestions(["Últimas noticias", "Noticias recientes", "Noticias de ayer"]));
});
app.intent("Recent News", conv => {
    // Get news within 24 hours
    const news = getNews(Date.now() - 24 * 60 * 60 * 1000, Date.now());
    // Reply
    if (news.length === 0) {
        reply(conv, "No hay noticias recientes. ¿Cuándo quieres saber las noticias?");
    } else {
        reply(conv, `Las noticias recientes. ${news.join("")} Es todo. ¿Cuándo quieres saber las noticias?`);
    }
});
// "Latest News" intent handler
app.intent("Latest News", conv => {
    // Get news within 24 hours
    const news = getNews(Date.now() - 24 * 60 * 60 * 1000, Date.now());
    if (news.length === 0) {
        reply(conv, "No hay últimas noticias. ¿Cuándo quieres saber las noticias?");
    } else {
        reply(conv, `Las últimas noticias. ${news[news.length - 1]} Es todo. ¿Cuándo quieres saber las noticias?`);
    }
});
app.intent("Past News", (conv, { date }) => {
    // Get news of specific date
    const start = new Date(date).setHours(0, 0, 0, 0);
    const news = getNews(start, start + 24 * 60 * 60 * 1000 - 1);
    // Reply
    if (news.length === 0) {
        reply(conv, "No hay noticias recientes especificas. ¿Cuándo quieres saber las noticias?");
    } else {
        reply(conv, `Las noticias de un dia especifico. ${news.join("")} Es todo. ¿Cuándo quieres saber las noticias?`);
    }
});
app.intent("Setup Daily Updates", conv => {
    // Request to register Daily Updates
    conv.ask(new RegisterUpdate({
        intent: "Recent News",
        frequency: "DAILY"
    }));
});
app.intent("Finish Daily Updates Setup", (conv, params, registered) => {
    if (registered && registered.status === "OK") {
        conv.close("Ok, voy a empezar a darte actualizaciones diarias. Hasta luego.");
    } else {
        reply(conv, "Siéntase libre de registrar actualizaciones diarias. ¿Cuándo quieres saber las noticias?");
    }
});
app.intent("Setup Push Notifications", conv => {
    conv.ask(new UpdatePermission({
        intent: "Latest News"
    }));
});
app.intent("Finish Push Notifications Setup", (conv, params, granted) => {
    if (conv.arguments.get("PERMISSION")||granted) {
        const userId = conv.user.id;
        console.log("userId", userId);
        conv.close("Te enviare notificaciones mas tarde. Hasta pronto");
    } else {
        reply(conv, "No pude registrarte en Notificaciones Push. ¿Cuándo quieres saber las noticias?");
    }
});
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);