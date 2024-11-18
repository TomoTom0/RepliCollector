"use strict";

const read_date = () => {
    let date_start = document.getElementById("date_start").value;
    let date_end = document.getElementById("date_end").value;
    const flag_singleMonth = document.getElementById("check_singleMonth").checked;
    if (flag_singleMonth) {
        const year = date_start.split("-")[0];
        const month = date_start.split("-")[1];
        date_start = new Date(year, month - 1, 2).toISOString().split("T")[0];
        date_end = new Date(year, month, 1).toISOString().split("T")[0];
    }
    return { date_start, date_end };
    }

const main_collect_hour = async () => {
    const { date_start, date_end } = read_date();

    // if (!year || !month ) return null;
    const response = send_message({command:"collect", args:{ date_start, date_end }});
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
    const input_start = document.getElementById("date_start");
    const input_end = document.getElementById("date_end");
    input_start.value = today.toISOString().split("T")[0];
    // month end
    input_end.value = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split("T")[0];
    input_end.setAttribute("min", input_start.value);

    const check_singleMonth = document.getElementById("check_singleMonth");
    let flag_singleMonth = await getSyncStorage("flag_singleMonth").then(item => item.flag_singleMonth);
    if (flag_singleMonth === undefined) flag_singleMonth = true;
    check_singleMonth.checked = flag_singleMonth;

    if (flag_singleMonth) {
        input_end.setAttribute("disabled", true);
    }

    check_singleMonth.addEventListener("change", function () {
        setSyncStorage({ flag_singleMonth: check_singleMonth.checked });
        if (check_singleMonth.checked) {
            input_end.setAttribute("disabled", true);
        } else {
            input_end.removeAttribute("disabled");
        }
    });
    input_start.addEventListener("change", function () {
        input_end.setAttribute("min", input_start.value);
        if (input_end.value < input_start.value) {
            input_end.value = input_start.value;
        }
    });


    // const input_year = document.getElementById("year");
    // const input_month = document.getElementById("month");
    // input_year.value = today.getFullYear();
    // input_year.setAttribute("max", today.getFullYear());
    // input_month.value = today.getMonth() + 1;

    const div_result = document.getElementById("result");
    document.addEventListener('click', async function (e) {
        if (e.target.id === "button_collectHours") {
            await main_collect_hour();
        } else if (e.target.id === "button_rememberCollection") {
            // const date_start = input_start.value;
            // const date_end = input_end.value;
            // const flag_singleMonth = check_singleMonth.checked;
            // const year = document.getElementById("year").value;
            const { date_start, date_end } = read_date();
            // const month = document.getElementById("month").value;
            // if (!year || !month) {
            //     div_result.innerHTML = "year or month is empty";
            //     return;
            // }
            await getSyncStorage("hour_collection").then(item => {
                const data = item.hour_collection;
                if (!data) data = {};
                const [sum_hours, related_hours_infos] = sumHours(data, date_start, date_end);
                // const hours_info = data[`${year}-${month}`] || {};
                const content = obtainMessage_hours(sum_hours, date_start, date_end).replace(/\n/g, "<br>");
                div_result.innerHTML = content;
                send_message({command:"show", args:{ date_start, date_end, sum_hours, related_hours_infos }});
            });
        }
    });
}