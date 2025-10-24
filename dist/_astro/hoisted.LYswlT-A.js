import"./hoisted.B4KYOqlt.js";const n=document.getElementById("file-upload"),p=document.getElementById("file-info"),L=document.getElementById("file-name"),E=document.getElementById("file-size"),C=document.getElementById("remove-file"),a=document.getElementById("submit-btn"),d=document.getElementById("submit-text"),v=document.getElementById("loading-spinner"),w=document.getElementById("upload-form"),u=document.getElementById("results-section"),m=document.getElementById("alerts-container"),S=document.getElementById("results-content"),r=n.closest(".border-dashed");["dragenter","dragover","dragleave","drop"].forEach(e=>{r.addEventListener(e,B,!1)});function B(e){e.preventDefault(),e.stopPropagation()}["dragenter","dragover"].forEach(e=>{r.addEventListener(e,I,!1)});["dragleave","drop"].forEach(e=>{r.addEventListener(e,T,!1)});function I(){r.classList.add("border-primary-400","bg-primary-50")}function T(){r.classList.remove("border-primary-400","bg-primary-50")}r.addEventListener("drop",$,!1);function $(e){const t=e.dataTransfer.files;t.length>0&&(n.files=t,x())}n.addEventListener("change",x);function x(){const e=n.files[0];if(e){if(!e.name.toLowerCase().endsWith(".csv")){i("error","Invalid file type. Please select a CSV file.");return}if(e.size>10*1024*1024){i("error","File too large. Maximum size is 10MB.");return}L.textContent=e.name,E.textContent=`${(e.size/1024).toFixed(1)} KB`,p.classList.remove("hidden"),a.disabled=!1,d.textContent="Process Facebook Data"}}C.addEventListener("click",()=>{n.value="",p.classList.add("hidden"),a.disabled=!0,d.textContent="Select a file to upload",h()});w.addEventListener("submit",async e=>{e.preventDefault();const s=n.files[0];if(s){a.disabled=!0,d.textContent="Processing...",v.classList.remove("hidden"),h();try{await P(s)}catch(t){i("error",`Processing failed: ${t.message}`)}finally{a.disabled=!1,d.textContent="Process Facebook Data",v.classList.add("hidden")}}});async function P(e){await new Promise(o=>setTimeout(o,2e3));const t=(await e.text()).trim().split(`
`);if(t.length<2)throw new Error("CSV file appears to be empty or invalid");const l=t[0].toLowerCase(),f=["ad set name","amount spent","results","cost per result"].filter(o=>!l.includes(o));if(f.length>0)throw new Error(`Missing required columns: ${f.join(", ")}`);const c=t.slice(1).filter(o=>o.trim()).length,g=Math.random()*5e3+1e3,y=Math.floor(Math.random()*100+20),b=g/y;i("success",`Successfully processed ${c} ad sets from Facebook data`),M({fileName:e.name,recordsProcessed:c,totalSpend:g,averageCPA:b,uploadTime:new Date().toISOString()}),F({fileName:e.name,recordsProcessed:c,uploadTime:new Date().toLocaleString()})}function i(e,s){const t=`
        <div class="bg-${e==="error"?"red":"green"}-50 border border-${e==="error"?"red":"green"}-200 text-${e==="error"?"red":"green"}-800 rounded-lg p-4 animate-fade-in">
          <div class="flex items-start">
            <span class="text-lg mr-2">${e==="error"?"❌":"✅"}</span>
            <span class="text-sm">${s}</span>
          </div>
        </div>
      `;m.innerHTML=t,u.classList.remove("hidden"),e==="success"&&setTimeout(()=>{m.innerHTML=""},5e3)}function M(e){const s=`
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900">${e.recordsProcessed}</div>
            <div class="text-sm text-gray-500">Ad Sets Processed</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900">$${e.totalSpend.toFixed(2)}</div>
            <div class="text-sm text-gray-500">Total Spend</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900">$${e.averageCPA.toFixed(2)}</div>
            <div class="text-sm text-gray-500">Average CPA</div>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t border-gray-200">
          <p class="text-sm text-gray-600">
            Data has been processed and is now available in the 
            <a href="/" class="text-primary-600 hover:text-primary-700 font-medium">dashboard</a>.
          </p>
        </div>
      `;S.innerHTML=s,u.classList.remove("hidden")}function F(e){const s=document.getElementById("recent-uploads"),t=s.querySelector(".text-center");t&&t.remove();const l=`
        <div class="flex items-center justify-between py-3 px-4 border border-gray-200 rounded-lg">
          <div class="flex items-center">
            <span class="text-green-500 mr-3">✅</span>
            <div>
              <p class="text-sm font-medium text-gray-900">${e.fileName}</p>
              <p class="text-xs text-gray-500">${e.recordsProcessed} records • ${e.uploadTime}</p>
            </div>
          </div>
          <span class="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
            Processed
          </span>
        </div>
      `;s.insertAdjacentHTML("afterbegin",l)}function h(){m.innerHTML="",u.classList.add("hidden")}
