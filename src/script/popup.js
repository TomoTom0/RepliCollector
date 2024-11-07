"use strict";

const main_collect_hour = async () => {
    const year = document.getElementById("year").value;
    const month = document.getElementById("month").value;
    console.log(year, month);

    if (!year || !month ) return null;
    const response = send_message({command:"collect", args:{ year, month }});
    return response;
};

const send_message = async (message) => {
    let response;
    console.log("sending message", message);
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, message, (responseFromContent) => {
            console.log("received response", responseFromContent);
            if (responseFromContent.close!==false) window.close();
            response = responseFromContent;
        });
    });
    return response;
};

window.onload = async function () {
    // set year and month
    const today = new Date();
    const input_year = document.getElementById("year")
    const input_month = document.getElementById("month")
    input_year.value = today.getFullYear();
    input_year.setAttribute("max", today.getFullYear());
    input_month.value = today.getMonth() + 1;

    const div_result = document.getElementById("result");
    document.addEventListener('click', async function (e) {
        if (e.target.id === "button_collectHours") {
            await main_collect_hour();
        } else if (e.target.id === "button_rememberCollection") {
            const year = document.getElementById("year").value;
            const month = document.getElementById("month").value;
            if (!year || !month) {
                div_result.innerHTML = "year or month is empty";
                return;
            }
            await getSyncStorage("hour_collection").then(item => {
                const data = item.hour_collection;
                if (!data) data = {};
                const hours_info = data[`${year}-${month}`] || {};
                const content = obtainMessage_hours(hours_info, year, month).replace(/\n/g, "<br>");
                div_result.innerHTML = content;
                send_message({command:"show", args:{ year, month, hours_info }});
            });
        }
    });
}