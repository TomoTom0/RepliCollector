"use strict";

let REPLICON_DOMAIN = null;
let GROUP_ID = null;

//------------------------------------
//         #  on loading
window.onload = async () => {
    const url_now = location.href;
    const url_splits=url_now.split("://")[1].split("/");
    const url_domain = url_splits[0];
    const url_group = url_splits[1];
    if (!/^\w+\.replicon\.com$/.test(url_domain)) return;
    REPLICON_DOMAIN = url_domain;
    GROUP_ID = url_group;


    chrome.runtime.onMessage.addListener(async (message, _ev, sendResponse) => {
        console.log("received message", message);
        const args = message.args;
        if (message.command === "collect") {
            triggered_collect_hour(args.year, args.month);
            sendResponse({close: true});
        } else if (message.command === "show") {
            console.log(args);
            sendResponse({close: false});
        }
        return true;
      });
};

//------------------------------------
//         #  on click
const triggered_collect_hour = async (year, month) => {
    const hour_collector = new HourCollector(year, month, REPLICON_DOMAIN, GROUP_ID);
    await hour_collector.collectHours();
    const hours_info = hour_collector.hours_info;
    console.log("response", hours_info);

    const content = obtainMessage_hours(hours_info, year, month);
    alert(content);
    getSyncStorage("hour_collection").then(item => {
        let data = item.hour_collection;
        if (!data) data = {};
        const new_data = {
            ...data,
            [`${year}-${month}`]: hour_collector.hours_info,
        };
        setSyncStorage({ hour_collection: new_data });
    })

};
