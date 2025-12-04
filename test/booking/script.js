// === DYNAMIC CALENDAR ===
const calendar = document.getElementById("calendar");
if(calendar) loadCalendar();

function loadCalendar(){
    for(let d=1; d<=30; d++){
        let div=document.createElement("div");
        div.className="calendar-day green"; // placeholder - availability logic insertable
        div.innerText=d;
        div.onclick=()=>selectDate(d);
        calendar.appendChild(div);
    }
}

function selectDate(day){
    sessionStorage.setItem("date",day);
    location.href="details.html";
}


// === FORM VALIDATION + COST ===
if(document.getElementById("bookingForm")){
    document.getElementById("selectedDate").value=sessionStorage.getItem("date");

    document.getElementById("mode").addEventListener("change",updateCost);
    document.getElementById("start").addEventListener("change",updateCost);
    document.getElementById("end").addEventListener("change",updateCost);
    document.getElementById("pax")?.addEventListener("input",updateCost);
}

function updateCost(){
    let mode=document.getElementById("mode").value;
    let start=document.getElementById("start").value;
    let end=document.getElementById("end").value;
    if(!start||!end) return;

    let hours=(new Date(`2000-01-01 ${end}`)-new Date(`2000-01-01 ${start}`))/3600000;
    let cost = mode==="study" 
        ? hours * 50 * (document.getElementById("pax").value || 1)
        : hours * 1000;

    document.getElementById("cost").innerText=`₱${cost}`;
}
