// VARIABILI GENERALI ************************************************
var jumper_attuale = null;
var jumper = new Array();

var schedecaso = new Array();
var old_tempo_schedecaso = null;
var schedecaso_attuale = null;

var pathnormativa = 'normativa.html';

var time;
var name;
var player;
var durata;
var old_tempo = null;

var jumperShowed = false;
var features = null;
var ratio = 2;
// FINE  VARIABILI GENERALI ******************************************


//PARAMETRI CONTENUTO   **********************************************
var anticipofine = 2;
var accessmode = 0;
var pdfslide = 0;
var normativa = 0;
//FINE PARAMETRI CONTENUTO   *****************************************


//VARIABILI SCORM ****************************************************
var findAPITries = 0;

var SCORM_TRUE = "true";
var SCORM_FALSE = "false";

//Since the Unload handler will be called twice, from both the onunload
//and onbeforeunload events, ensure that we only call LMSFinish once.
var finishCalled = false;

//Track whether or not we successfully initialized.
var initialized = false;

var API = null;

var startTime = Date.now() / 1000 | 0;

var suspend_data = {};

var lesson_status = false;
//FINE VARIABILI SCORM ************************************************


jQuery(document).ready(function ($) {

    window.onload = ScormProcessInitialize;
    window.onunload = ScormProcessFinish;
    window.onbeforeunload = ScormProcessFinish;

    $(window).on('beforeunload', function () {
        ScormProcessFinish;
    });

    $("#box_jumper").on('click', '.jumper', function () {
        var rel = jQuery(this).attr('rel');
        if (lesson_status || accessmode == 0) {
            player.setCurrentTime(rel);
            sliding(time);
        } else {
            alert("E' necessario completare la risorsa per poter usare il menu di navigazione");
        }
    });

    $("#mostracoupon").on('click', function () {
        jumperShowed = !jumperShowed;
        if (jumperShowed) {
            $('.container-video').addClass('leftSpace');
            $("#mostracoupon").addClass('leftSpace');
            $("#box_jumper").addClass('leftSpace');
        } else
        {
            $('.container-video').removeClass('leftSpace');
            $("#mostracoupon").removeClass('leftSpace');
            $("#box_jumper").removeClass('leftSpace');
        }
    });

    $('#BtSchedaCaso').popover({
        content: "<b>Scheda caso aggiornata</b><br> clicca sul pulsante per visualizzarla e poi prosegui nella visione del video.",
        html: true
    }).click(function () {
        $(this).popover('hide');
    });

    $('#close').on('click', function() {
        console.log('close');
        ScormProcessFinish();
        parent.window.close();
    });


    $("#ripartidainizio").on('click',function(event){
        console.log('ripartidainizio');
        player.setCurrentTime(0);
        sliding(0);
        $('#panel_ripresa_stato').modal('toggle');
    });

    var slide = ["col-sm-3", "col-sm-4", "col-sm-5", "col-sm-6", "col-sm-7", "col-sm-8", "col-sm-9"];
    var video = ["col-sm-9", "col-sm-8", "col-sm-7", "col-sm-6", "col-sm-5", "col-sm-4", "col-sm-3"];

    $('#layout_a').click(function () {
        console.log('-> layout A');
        if (ratio > 1)
            ratio = ratio - 1;
        jQuery("#boxslide").removeClass().addClass(slide[ratio]);
        jQuery("#boxvideo").removeClass().addClass(video[ratio]);
    });

    $('#layout_c').click(function () {
        console.log('-> layout C');
        if (ratio < slide.length - 1)
            ratio = ratio + 1;
        jQuery("#boxslide").removeClass().addClass(slide[ratio]);
        jQuery("#boxvideo").removeClass().addClass(video[ratio]);
    });

});

function load_Params() {
    console.log('load_Params');
    $.ajax({
        type: "GET",
        url: "params.xml",
        dataType: "xml",
        success: parse_Params
    });
}

function parse_Params(xml) {
    $(xml).find("Params").each(function ()
    {
        get_accessmode = $(this).find("accessmode").text();
        get_anticipofine = $(this).find("anticipofine").text();
        get_pdfslide = $(this).find("pdfslide").text();
        get_normativa = $(this).find("normativa").text();

        accessmode = parseInt(get_accessmode);
        anticipofine = parseInt(get_anticipofine);
        pdfslide = parseInt(get_pdfslide);
        normativa = parseInt(get_normativa);

        console.log('Param: ' + accessmode + '.' + anticipofine + '.' + pdfslide);

    });
    startup();
}

function load_Cue_Points() {
    console.log('load_Cue_Points');
    $.ajax({
        type: "GET",
        url: "cue_points.xml",
        dataType: "xml",
        success: parse_Cue_Points
    });
}

function parse_Cue_Points(xml) {
    var id = 0;
    $(xml).find("CuePoint").each(function ()
    {
        time = $(this).find("Time").text();
        name = $(this).find("Name").text();
        $("#box_jumper").append(
            "<div id=" + id + " class='jumper' rel=" + time + ">" + timeFormat(time) + " | " + name + "</div>");

        jumper[id] = {
            'tstart': time,
            'titolo': name
        }

        id++;
    });
}

function load_SchedaCaso() {
    console.log('load_SchedeCaso');
    $.ajax({
        type: "GET",
        url: "schedecaso.xml",
        dataType: "xml",
        success: parse_SchedaCaso
    });
}

function parse_SchedaCaso(xml) {
    console.log('parse_SchedeCaso');
    var id = 0;
    $(xml).find("CuePoint").each(function ()
    {
        time = $(this).find("Time").text();
        name = $(this).find("Name").text();
        dialog = $(this).find("Dialog").text();

        schedecaso[id] = {
            'tstart': time,
            'titolo': name,
            'dialog': dialog
        }

        id++;
    });
}

function startup() {
    if (lesson_status || accessmode === 0) {
        features = ['playpause', 'current', 'progress', 'duration', 'volume', 'fullscreen', 'tracks']
    } else {
        features = ['playpause', 'current', 'duration', 'volume', 'fullscreen', 'tracks']
    }

    //Visibilita download slide PDF
    if (!pdfslide) {
        $('#scaricaslide').hide();
    }

    //Visibilita normativa
    if (!normativa)
        $('#btn_normativa').hide();
    else
        $('#panel_normativa_body').load(pathnormativa);

    // declare object for video
    player = new MediaElementPlayer('video', {
        features: features,
        slidesSelector: '.mejs-slides-player-slides',
        autoplay: true,
        success: function (mediaElement, domObject) {

            mediaElement.addEventListener('loadedmetadata', function (e) {
                console.log("metadata loaded, bookmark -> posizionato al sec: "+ suspend_data.bookmark);
                player.setCurrentTime(suspend_data.bookmark);
                sliding(suspend_data.bookmark);
                durata = parseInt(mediaElement.duration);
            });

            mediaElement.addEventListener('timeupdate', function (e) {
                time = mediaElement.currentTime.toFixed(0);
                sliding(time);
                fschedecaso(time);
            }, false);

            mediaElement.addEventListener('ended', function (e) {
                API.LMSSetValue("cmi.core.lesson_status", "completed");
            }, false);
        },
        error: function () {
            console.log('Errore player');
        }
    });
}

function sliding(tempo) {

    console.log("sld -> "+tempo);

    if(suspend_data.bookmark < parseInt(tempo))
        suspend_data.bookmark = parseInt(tempo);

    if (tempo > durata - anticipofine) {
        API.LMSSetValue("cmi.core.lesson_status", "completed");
        lesson_status = true;
    }

    if (old_tempo != tempo && typeof (jumper.length) != 'undefined') {
        old_tempo = tempo;
        var currTime = parseInt(tempo);
        var i = 0;
        var past_jumper_selector = new Array();
        while (i < jumper.length && currTime >= parseInt(jumper[i]['tstart'])) {
            past_jumper_selector[i] = '#' + i;
            i++;
        }
        i--; // col ciclo while vado avanti di 1
        if (i < jumper.length && i != jumper_attuale) { // se cambio jumper

            //Aggiorno lo scorm
            ScormUpdate();

            jumper_attuale = i;
            // cancello eventuali jumper azzurri
            jQuery('.jumper').css('background-color', '#fff');

            // jumper attuale � azzurro
            jQuery('#' + i).css('background-color', '#98ACC6');
        }
    }
}

function timeFormat(msDurata) {

    msDurata = msDurata*1000;
    var millisecondi = parseInt((msDurata%1000)/100)
        , secondi = parseInt((msDurata/1000)%60)
        , minuti = parseInt((msDurata/(1000*60))%60)
        , ore = parseInt((msDurata/(1000*60*60))%24);

    ore = (ore < 10) ? "0" + ore : ore;
    minuti = (minuti < 10) ? "0" + minuti : minuti;
    secondi = (secondi < 10) ? "0" + secondi : secondi;

    return ore + ":" + minuti + ":" + secondi ;
}

function findAPI(win) {
    // Check to see if the window (win) contains the API
    // if the window (win) does not contain the API and
    // the window (win) has a parent window and the parent window
    // is not the same as the window (win)
    while ((win.API == null) &&
    (win.parent != null) &&
    (win.parent != win))
    {
        // increment the number of findAPITries
        findAPITries++;

        // Note: 7 is an arbitrary number, but should be more than sufficient
        if (findAPITries > 7)
        {
            alert("Error finding API -- too deeply nested.");
            return null;
        }

        // set the variable that represents the window being
        // being searched to be the parent of the current window
        // then search for the API again
        win = win.parent;
    }
    return win.API;
}

function getAPI() {
    // start by looking for the API in the current window
    var theAPI = findAPI(window);

    // if the API is null (could not be found in the current window)
    // and the current window has an opener window
    if ((theAPI == null) &&
        (window.opener != null) &&
        (typeof (window.opener) != "undefined"))
    {
        // try to find the API in the current window�s opener
        theAPI = findAPI(window.opener);
    }
    // if the API has not been found
    if (theAPI == null)
    {
        // Alert the user that the API Adapter could not be found
        alert("Unable to find an API adapter");
    }
    return theAPI;
}

function ScormProcessInitialize() {
    var result;

    API = getAPI();

    if (API == null) {
        alert("ERROR - Could not establish a connection with the LMS.\n\nYour results may not be recorded.");
        return;
    }

    result = API.LMSInitialize("");

    if (result == SCORM_FALSE) {
        var errorNumber = API.LMSGetLastError();
        var errorString = API.LMSGetErrorString(errorNumber);
        var diagnostic = API.LMSGetDiagnostic(errorNumber);

        var errorDescription = "Number: " + errorNumber + "\nDescription: " + errorString + "\nDiagnostic: " + diagnostic;

//        alert("Error - Could not initialize communication with the LMS.\n\nYour results may not be recorded.\n\n" + errorDescription);
        return;
    }

    initialized = true;

    load = API.LMSGetValue("cmi.suspend_data");

    if (!load) {
        suspend_data.attempt = 0;
        suspend_data.bookmark = 0;

        console.log("Attempt [inizializzato]: " + suspend_data.attempt)
        console.log("Bookmark [inizializzato]: " + suspend_data.bookmark)
    } else{
        suspend_data = JSON.parse(load);
        console.log("Attempt [letto scorm]: " + suspend_data.attempt)
        console.log("Bookmark [letto scorm]: " + suspend_data.bookmark)
    }

    load = API.LMSGetValue("cmi.core.lesson_status");
    if (load == 'completed') {
        console.log('completed');
        lesson_status = true;
        $('#panel_ripresa_stato').modal('show');
    }


    old_tempo = suspend_data.bookmark;
    time = suspend_data.bookmark;
    suspend_data.attempt++;

    console.log("Load suspend_data: "+ suspend_data.bookmark);

    load_Cue_Points();
    load_Params();
    load_SchedaCaso();

}

function ScormProcessFinish() {

    var result;

    //Imposto il suspend_data
    suspend_data.attempt++;
    var json_suspend_data = JSON.stringify(suspend_data);
    result = API.LMSSetValue("cmi.suspend_data", json_suspend_data);
    // console.log("Salvataggio suspend_data:"+result);

    //Imposto il session_time
    var permanenza = Date.now() / 1000 | 0;
    permanenza =   timeFormat(permanenza - startTime) + ".00";
    result = API.LMSSetValue("cmi.core.session_time", permanenza);

    //Imposto il lesson_status
    if (!lesson_status)
        API.LMSSetValue("cmi.core.lesson_status", "incomplete");

    //Don't terminate if we haven't initialized or if we've already terminated
    if (initialized == false || finishCalled == true) {
        return;
    }

    //FINE
    result = API.LMSFinish("");
    finishCalled = true;

    if (result == SCORM_FALSE) {
        var errorNumber = API.LMSGetLastError();
        var errorString = API.LMSGetErrorString(errorNumber);
        var diagnostic = API.LMSGetDiagnostic(errorNumber);

        var errorDescription = "Number: " + errorNumber + "\nDescription: " + errorString + "\nDiagnostic: " + diagnostic;

        alert("Error - Could not terminate communication with the LMS.\n\nYour results may not be recorded.\n\n" + errorDescription);
        return;
    }
    console.log('finished');
}

function ScormUpdate() {

    var result;

    //Imposto il suspend_data
    // suspend_data.attempt++;
    var json_suspend_data = JSON.stringify(suspend_data);
    result = API.LMSSetValue("cmi.suspend_data", json_suspend_data);
    console.log("Salvataggio suspend_data:"+result);

    //Imposto il session_time
    var permanenza = Date.now() / 1000 | 0;
    permanenza =   timeFormat(permanenza - startTime) + ".00";
    result = API.LMSSetValue("cmi.core.session_time", permanenza);

    //Imposto il lesson_status
    if (!lesson_status)
        API.LMSSetValue("cmi.core.lesson_status", "incomplete");

    //Don't terminate if we haven't initialized or if we've already terminated
    if (initialized == false || finishCalled == true) {
        return;
    }

    //FINE
    result = API.LMSCommit("");
    finishCalled = false;

    if (result == SCORM_FALSE) {
        var errorNumber = API.LMSGetLastError();
        var errorString = API.LMSGetErrorString(errorNumber);
        var diagnostic = API.LMSGetDiagnostic(errorNumber);

        var errorDescription = "Number: " + errorNumber + "\nDescription: " + errorString + "\nDiagnostic: " + diagnostic;

        alert("Error - Could not terminate communication with the LMS.\n\nYour results may not be recorded.\n\n" + errorDescription);
        return;
    }

    console.log('scormupdate');
}

function fschedecaso(tempo_schedecaso) {

    if (old_tempo_schedecaso != tempo_schedecaso && typeof (schedecaso.length) != 'undefined') {

        old_tempo_schedecaso = tempo_schedecaso;
        var currTime = parseInt(tempo_schedecaso);
        var i = 0;

        while (i < schedecaso.length && currTime >= parseInt(schedecaso[i]['tstart'])) {
            i++;
        }

        i--; // col ciclo while vado avanti di 1

        // console.log("scheda selezionata " + i + "-" + parseInt(schedecaso[i]['tstart']) + schedecaso[i]["titolo"]);

        if (i < schedecaso.length && i != schedecaso_attuale && schedecaso.length > 0) {
            console.log("cambio schedecaso -> AJAX per set position" + schedecaso.length);
            schedecaso_attuale = i;
            // cancello eventuali jumper azzurri
            pathschedacaso = 'schedecaso/' + schedecaso[i]["titolo"];

            jQuery('#panel_schedacaso_body').load(pathschedacaso, function () {
                if (schedecaso[i]["tstart"] == parseInt(currTime) && schedecaso[i]["tstart"] > 1) {

                    player.pause();

                    $('#BtSchedaCaso').popover('show');
                    $('#BtSchedaCaso').on('shown.bs.popover', function () {
                        setTimeout(function () {
                            $('#BtSchedaCaso').popover('hide');
                        }, 4000);
                    });
                }
            });
        }
    }
}



// *****************************************************************************
// 
// 
// B L O C C O   T A S T I  
// 
// 
// *****************************************************************************

document.oncontextmenu = function () { // Use document as opposed to window for IE8 compatibility
    alert("Operazione non permessa.");
    return false;
};

//window.addEventListener('contextmenu', function (e) { // Not compatible with IE < 9
//    alert("Impossibile utilizzare questo tasto");
//  e.preventDefault();
//}, false);




if (navigator.appName.toLowerCase().indexOf("netscape") != -1)
{
    // document.onkeydown=onKeyDownFunctionNS
}
else
{
    document.onkeydown=onKeyDownFunction
}
function onKeyDownFunctionNS(e){
    //return false;
    console.log("onKeyDownFunctionNS");
}
function onKeyDownFunction(){
    if(window.event.keyCode == 9)// TAB
    {
        alert("Impossibile utilizzare il tasto TAB tra le pagine del browser")
        window.event.returnValue = false
        return null
    }

    if(window.event.keyCode == 17)// CTRL + R
    {
        alert("Impossibile utilizzare la tastiera per navigare tra le pagine del browser")
        window.event.returnValue = false
        return null
    }

    if(window.event.ctrlKey)
    {
        if(window.event.keyCode == 82) // R
        {
            alert("Impossibile utilizzare la tastiera per navigare tra le pagine del browser")
            window.event.returnValue = false
        }
    }

    if(window.event.altKey)
    {
        alert("Impossibile utilizzare la tastiera per navigare tra le pagine del browser")
        window.event.returnValue = false
    }

    if(window.event.keyCode == 93)
    {
        alert("Impossibile utilizzare i tasti funzione all'interno del browser")
        window.event.returnValue = false
    }

    if(window.event.keyCode > 112 &&  window.event.keyCode < 124)
    {
        alert("Impossibile utilizzare i tasti funzione all'interno del browser")
        window.event.keyCode = 102
        window.event.returnValue = false
    }

    if(window.event.keyCode == 8)// backspace
    {
        alert("Impossibile utilizzare la tastiera per navigare tra le pagine del browser")
        window.event.returnValue = false
        return null
    }
}

