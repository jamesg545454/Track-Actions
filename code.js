﻿// region COMMENTS
/*  Track Actions

    This script adds various functionality to Presonus Studio One.
    Remove empty tracks, remove disabled tracks, remove inactive track layers,
    custom fade actions, and a few track naming and formatting functions.
    
    Author: Lawrence

    Feel free to copy and reuse any of this source code without restriction.

    ** region tags are valid for code folding in Visual Studio Code
    https://code.visualstudio.com/download
*/
// endregion

// region CONSTANTS
const kPackageID = "trackActions";
const scriptTitle = "Track Actions";
// endregion

function trackAction(actionValue) 
{  
    this.interfaces = [ Host.Interfaces.IEditTask, Host.Interfaces.IParamObserver, Host.Interfaces.IObserver ]

    // region  PREPARE EDIT
  
    // --------- PREP DIALOG CONTROLS ------------------------------------------------------------------------------------------------

    this.prepareEdit = function (context)
    {        
        // create a parameter list for dialog contols
        this.paramList = Host.Classes.createInstance("CCL:ParamList")
        this.paramList.controller = this;

        // edit Box on search form
        this.searchBox = this.paramList.addString("searchBox") ;

        // help button on search form
        this.helpButton = this.paramList.addInteger(0,1,"helpButton") ;

        // edit boxes and replace button on search form
        this.sourceBox = this.paramList.addString("sourceBox") ;
        this.replaceBox = this.paramList.addString("replaceBox") ;
        this.buttonReplace = this.paramList.addInteger(0,1,"buttonReplace") ;
        
        // radio buttons for fade options dialog
        this.fadeOptions = this.paramList.addInteger(0,2,"fadeOptions");

        // length edit box on fade options dialog
        this.fadeLength = this.paramList.addString("fadeLength") ;

        // save button on fade options dialog
        this.saveFadeLength = this.paramList.addInteger(0,1,"saveFadeLength") ;
        this.saveFadeLength.enabled = false;
        
        return Host.Results.kResultOk; 
    }
// endregion
 
    // -------- PERFORM VARIOUS TARGETED ACTIONS ------------------------------------------------------------------------------------

    this.performEdit = function (context)
    {    
        // region CONTEXT VARS

        this.context = context;
        this.functions = context.functions;
        this.functions.executeImmediately = true;
        
        //  boolean vars for only saving a version backup on the first iteration of a loop
        var savedEmpty = false
        var savedDisabled = false;   
        // endregion

        // region SWITCH / SWITCH CONTEXTUAL ACTIONS

        switch (actionValue)
        {

            // region   ----------- REMOVE VISIBLE EMPTY TRACKS ---------------------------------------------------------------------
            case "empty":

                // collect all tracks with no media on the active layer
                var tracks = getTracks(this.context);

                // iterate and save a version backup before removing the first track
                for (i=0; i < tracks.length; i++)
                {
                    var track = tracks[i];

                    if ( track.isEmpty() )
                    {
                        // only remove empty visible audio and midi tracks
                        if (track.mediaType == "Audio" || track.mediaType == "Music"  && track.mediaType != null)
                        {
                            // only save version on first loop iteration
                            if (savedEmpty == false) { saveNewVersion("Before Removing Empty Tracks"); savedEmpty = true; }
                            this.functions.removeTrack(track);
                        }               
                    }
                }

            break;
            // endregion  

            // region   ----------- REMOVE VISIBLE DISABLED TRACKS ------------------------------------------------------------------
            
            case "disabled":

                var tracks = getTracks( this.context);

                for (i=0; i < tracks.length; i++)
                {
                    var track = tracks[i];

                    // avoid errors on tracks that cannot be disabled
                    if ( track.channel != undefined && track.channel.disabled == true )
                    {
                        // only save version on first loop iteration
                        if (savedDisabled == false) {saveNewVersion("Before Removing Disabled Tracks"); savedDisabled = true; }
                        this.functions.removeTrack(track);
                    }
                }

            break;
            // endregion

            // region   ----------- REMOVE INACTIVE LAYERS A SINGE TRACK ------------------------------------------------------------
            
            case "removeLayers":

            // this function cuts media from the active layer, parses the number of inactive layers and removes all inactive layers,
            // removes any media from the last layer, and then pastes the original media back onto the active layer, essentially
            // removing all incactive layers and leaving the original media back to the active layer at the same position.

            var trackList =  this.context.mainTrackList;
            var mediaWasCut = false;
            
                // act on the first selected track only
                var track = trackList.getSelectedTrack(0);

                // if it has no inactive layers don't do anything
                var count = track.layers.count;
                if ( count == 1 ) { return; }

                // save a version backup before removing any layers
                saveNewVersion(track.name + ": Before Removing Layers");

                // isolate / select only the one track to avoid the
                // GUI commands potentially acting on multiple tracks
                // if multiple tracks were originally selected
                trackList.selectTrack(track);

                // force off automataion visibility before selection and 
                // cutting, otherwise cut will cut automation and not media
                Host.GUI.Commands.interpretCommand("Automation", "Show / Hide", false, Host.Attributes(["State", "0"]));

                // if active layer has any media clips, cut them to the clipboard
                if ( !track.isEmpty() )
                {             
                    Host.GUI.Commands.interpretCommand("Edit", "Select All on Tracks");
                    Host.GUI.Commands.interpretCommand("Edit", "Cut");
                    
                    // flag: media was cut from the active layer
                    mediaWasCut = true;
                }

                // remove all inactive layers, count - 1, the last active layer can't be removed
                for (layer = 0; layer < count - 1; layer++)
                {
                    Host.GUI.Commands.deferCommand("Track", "Remove Layer");
                }

                // delete any remaining media on the active last layer              
                Host.GUI.Commands.deferCommand("Edit", "Select All on Tracks");
                Host.GUI.Commands.deferCommand("Edit", "Delete");

                // only fire paste if media was cut from the original active layer to
                // avoiding potentially pasting the wrong data to the active layer
                if (mediaWasCut)
                {      
                    Host.GUI.Commands.deferCommand("Edit", "Paste at Original Position");
                    Host.GUI.Commands.deferCommand("Edit", "Deselect All");
                }

            break;
            // endregion

            // region   ----------- TOGGLE MASTER BUS UNITY / DIM -------------------------------------------------------------------
            case "dimMaster":

                // get the master bus object
                var master = getMasterBus(this.context);
                var dimLevel = 0;
            
                // try to get the dim value from the master bus name 
                
                try
                {
                    var data = master.label.split("-");                
                    dimLevel = Number("-" + data[1].trim() );
                }
                catch(err)
                {
                    // if parse fails, deafault to -10 dim
                    dimLevel = (-10) ;
                }   

                // convert the dim level db value to a floating point number
                var dim = ( Math.pow( 10, parseFloat( dimLevel/20 ) ) );

                // if master fader not at unity set to unity, else, set dim level
                switch (master.volume.toString() != "1" )
                {
                    case  true:
                        master.volume = 1;
                        break;

                    default:
                        master.volume = dim;
                        break;
                }

            break;
            // endregion
            
            // region   ----------- RESET CONSOLE, FADERS TO 0, PANS TO CENTER, PLUGINS OFF -----------------------------------------
            
            case "resetMixer":

                if ( ask ( "Reset console? This will make a version backup and reset all faders and pans.") == Host.GUI.Constants.kYes )
                {
                    // store a version before the reset
                    saveNewVersion("Before Reset Console");

                    // master bus to unity gain
                    var master = getMasterBus(this.context);
                    master.volume = 1;

                    // turn off all plugins, action toggle assumes they're all on
                    // literal code below to force state off doesn't work for some reason, still toggles on/off
                    // interpretCommand("Device", "Activate All Inserts", false, Host.Attributes( ["State", "0"] ) );
                    Host.GUI.Commands.interpretCommand("Device", "Activate All Inserts");

                    var environment =  this.context.functions.root.environment;
                    var console = environment.find("MixerConsole");
                    var channelList = console.getChannelList(1);

                    // reset faders and pans
                    for (i=0; i < channelList.numChannels; i++)
                    {
                        var channel = channelList.getChannel(i)  
                        channel.focus(); 
                        if (channel.volume != undefined)    { channel.volume = 0; }
                        if (channel.pan != undefined )      { channel.pan = 0.5;  }
                    }
                }

            break;
            // endregion

            // region   ----------- FORMAT TRACK NAMES: Example: bASS > Bass --------------------------------------------------------
            case "formatNames":

                var tracks = getTracks(this.context);
                for (var i = 0; i < tracks.length; i++) {
                    var track = tracks[i];
                    if (track.name == undefined) {continue;}
                    var result = capWords(track.name.trim())
                    this.functions.renameEvent(track, result);
                }
                
            break;
            // endregion
        
            // region   ----------- OPEN TRACK FILTER DIALOG ------------------------------------------------------------------------
            // *** filter only works if Track Scene 1 is set to make all tracks visible ***

            case "filter":

                // close the track list to speed it up for larger track counts
                Host.GUI.Commands.interpretCommand("View", "Track List", false, Host.Attributes(["State", "0"]));

                // this.tracklist to pass object var to onParamChange()
                this.trackList = this.context.mainTrackList;  
                this.functions = this.context.functions;

                // open the track filter dialog
                Host.GUI.runDialog(Host.GUI.Themes.getTheme(kPackageID), "TrackSearch", this);

                return Host.Results.kResultOk; 
            
            break;
            // endregion

            // region   ----------- OPEN REPLACE DIALOG -----------------------------------------------------------------------------
            case "replaceNames":
                // open the track rename dialog
                Host.GUI.runDialog(Host.GUI.Themes.getTheme(kPackageID), "ReplaceNames", this);
                return Host.Results.kResultOk; 
     
            break;
            // endregion
            
            // region   ----------- FADE IN AND OUT AT SPLIT POINT ------------------------------------------------------------------
            
            case "fadeSettings" :
  
                // get the settings from disk if any
                try
                {
                    var fadeSettings = readTextFile(scriptTitle, "fadeSettings")
                    var data = fadeSettings[0].split("|");
                    this.fadeLength.string = data[0];
                    this.fadeOptions.value = Number(data[1]);
                }
                catch(err)
                {
                    this.fadeLength.value = 0.005;
                    this.fadeOptions.value = 1;
                }

                Host.GUI.runDialog(Host.GUI.Themes.getTheme(kPackageID), "Fade Settings", this);
                return Host.Results.kResultOk; 

            break;

            // -------------------------------------------------------------------------------

            case "fadeAtSplit" :
                
                // get saved fade settings if any and if not return defaults
                var fade = getFadeSettings();
                
                var clips = new Array();
                var selectFunctions = this.context.editor.createSelectFunctions(this.functions);

                var iterator = this.context.iterator
                while(!iterator.done())
                {
                    var event = iterator.next();
                    clips.push(event)
                }
                
                // type: 0 = linear, Log = 1, Exp = 2
                this.functions.createFadeIn(  clips[0], fade.type, fade.length, fade.bend );  
                this.functions.createFadeOut( clips[1], fade.type, fade.length, fade.bend  );

                this.context.editor.selection.unselectAll();
                selectFunctions.select(clips[0]);
                
            break;
            // endregion

            // region   ----------- FADE IN AND OUT ---------------------------------------------------------------------------------
            case "fadeIn" :

                var fade = getFadeSettings();
                var iterator = this.context.iterator
                while(!iterator.done())
                {
                    var event = iterator.next();
                    this.functions.createFadeIn( event, fade.type, fade.length, fade.bend ); 
                } 

            break;

            // -----------------------------------------------------------------------------

            case "fadeOut" :

                var fade = getFadeSettings();
                var iterator = this.context.iterator
                while(!iterator.done())
                {
                    var event = iterator.next();
                    this.functions.createFadeOut( event, fade.type, fade.length, fade.bend ); 
                } 
            
            break;             
            // endregion          

        }   
        // endregion

        return Host.Results.kResultOk; 

    }  // <<<<<----------------------- END PERFORM EDIT ----------------------------------------------------------------------- <<<<<
  
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////     DIALOG ACTIONS, FILTER, REPLACE     ////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //region PARAM CHANGED
    this.paramChanged = function (param)
    {
        
        // region HELP BUTTON
        if  ( param.name == "helpButton" )
        {   
            alert("'Track | Scene 1' must be set to show all tracks for the filter to work correctly.")
        }  

        if (param.name == "fadeOptions" || param.name == "fadeLength")
        {
            this.saveFadeLength.enabled = true;
        }
        // save fade length to disk
        if (param.name == "saveFadeLength")
        {
            var text = this.fadeLength.string + "|" + this.fadeOptions.value.toString();
            writeTextFile (scriptTitle, "fadeSettings", text  )
            this.saveFadeLength.enabled = false;
        }
        // endregion

        // region BATCH REPLACE

        // ----- BATCH REPLACE PARTS OF TRACK NAMES --------------------------------------------------------------

        if ( param.name == "buttonReplace")
        {
            var tracks = getTracks(this.context);
            
            for ( i = 0; i < tracks.length; i++) 
            {
                var track = tracks[i];
                
                if (track.name == null) {continue;}
                var name  = track.name.toString();
                var newname = name.replace(this.sourceBox.string.trim(), this.replaceBox.string.trim());
                this.functions.renameEvent(track, newname.toString());
            }
        }
        // endregion

        // region FILTER TRACKS

        // ----- FILTER TRACKS BY CRITERIA  ----------------------------------------------------------------------

        if  ( param.name == "searchBox" )
        {     
            // turn off to visually speed up
            this.context.editor.showSelection(0);

            // track scene one must make all tracks visible for the filter to work correctly
            Host.studioapp.interpretCommand("Track", "Select Scene 1");

            // if trim show all tracks, clear filter
            if (this.searchBox.string.trim() == "")
            {
                Host.studioapp.interpretCommand("Zoom", "Zoom Full", false, Host.Attributes(["State", "1"]));
                return;
            }

            // iterate all tracks and hide what doesn't match
            for (i=0; i < this.trackList.numTracks; i++)
            {
               
                var track = this.trackList.getTrack(i);

                // exclude vca, folder, and automation tracks from the filter. for example,
                // hiding a folder track would also hide all of it's child tracks
                if (  track.toString().indexOf("VCA") > -1   ||  track.toString().indexOf("Folder" ) > -1  || 
                        track.toString().indexOf("Automation") > -1 ) {  continue; }

                // account for any potential error with name param
                if (track.name == undefined) { continue; }

                // track has to be independently selected to hide only that track
                this.trackList.selectTrack(track)

                // if it's a media track and it doesn't match the filter, hide it
                if (  track.toString().indexOf("MediaTrack") > -1 ) 
                {
                    if ( track.name.toUpperCase().indexOf(this.searchBox.string.toUpperCase()) == -1 )
                    {
                        Host.studioapp.interpretCommand("Track", "Hide");
                    }
                }
            }

            // zoom full to vertically fill the screen with the visible tracks after the filter
            Host.studioapp.interpretCommand("Zoom", "Zoom Full", false, Host.Attributes(["State", "1"]));

            // restore setting
            this.context.editor.showSelection(1);
        }
        // endregion

    } 
    // endregion PARAM CHANGED


} // <<<<<---------------- END MAIN FUNCTION ----------------------------------------------------------------------------------- <<<<<

// ------- Targeted Create Instance Functions ----------------------------------------------------------------------------------------

// region CREATE INSTANCES
function removeEmpty()          { return new trackAction(   "empty"         ); }
function removeDisabled()       { return new trackAction(   "disabled"      ); }
function removeLayers()         { return new trackAction(   "removeLayers"  ); }
function searchTracks()         { return new trackAction(   "filter"        ); }
function dimMasterBus()         { return new trackAction(   "dimMaster"     ); }
function resetConsole()         { return new trackAction(   "resetMixer"    ); }
function formatNames()          { return new trackAction(   "formatNames"   ); }
function replaceNames()         { return new trackAction(   "replaceNames"  ); }
function fadeSettings()         { return new trackAction(   "fadeSettings"  ); }
function fadeIn()               { return new trackAction(   "fadeIn"        ); }
function fadeOut()              { return new trackAction(   "fadeOut"       ); }

function fadeAtSplit()          
{ 
    Host.GUI.Commands.interpretCommand("Navigation", "Left");
    Host.GUI.Commands.interpretCommand("Navigation", "Right Extend");
                                 return new trackAction(    "fadeAtSplit"   ); 
}
// endregion

// region  HELPER FUNCTIONS

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////  HELPER FUNCIONS  ///////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// save a new version backup
function saveNewVersion(name)
{ 
    Host.GUI.Commands.interpretCommand( "File", "Save New Version", false, Host.Attributes( ["Description", name] ) ); 
}

// -----------------------------------------------------------------------------------------------------------------------------------

// track indexes change in real time when removing tracks so putting them
// into an array allows addressing them directly and not by index when
// doing things like removing tracks

// returns an array of all visible tracks
function getTracks(context)
{ 
    var tracks = new Array();
    var trackList = context.mainTrackList;
    
    for(i = 0; i < trackList.numTracks; i++)
    {
        var track = trackList.getTrack(i);

        // avoid duplicating array entries
        if(tracks.indexOf(track) < 0 ) 
        {
            tracks.push(track);
        } 
    }
        return tracks;
}

// ---------------------------------------------------------------------------------------

// returns the master bus channel object
function getMasterBus (context)
{
    return context.functions.root.environment.find("MixerConsole").getChannelList(3).getChannel(0);
}

// ---------------------------------------------------------------------------------------

// lowercase all letters and cap the first letter in every word
function capWords(str) 
{
    str = str.toLowerCase();
    var array1 = str.split(' ');
    var newarray1 = [];
    for (var x = 0; x < array1.length; x++) 
    {
        newarray1.push(array1[x].charAt(0).toUpperCase() + array1[x].slice(1));
    }
    return newarray1.join(' ');
}

// ---------------------------------------------------------------------------------------

// shortcut to call alert box
function alert(msg)
{
    Host.GUI.alert(msg);
}

// ---------------------------------------------------------------------------------------

// shortcut to call ask message
function ask(msg)
{
    var result = Host.GUI.ask (msg)// != Host.GUI.Constants.kYes
    return result;
}

// ---------------------------------------------------------------------------------------

// batch write text to a simple text file
function writeTextFile (folder, filename, text)
{
    var path = Host.Url("local://$USERCONTENT/" + folder + "/" + filename + ".txt");
    let textFile = Host.IO.createTextFile (path);
    if(textFile)
        { 
            textFile.writeLine (text) ;    
            textFile.close ();
        }
}

// ---------------------------------------------------------------------------------------

// read simple text file line by line into an array
function readTextFile (folder, filename)
{
    var path = Host.Url("local://$USERCONTENT/" + folder + "/" + filename + ".txt");
    let textFile = Host.IO.openTextFile (path);

    if (textFile)
    {
        var fileArray = new Array();
        while(!textFile.endOfStream)
        {
            fileArray.push(textFile.readLine ()) ;    
        }
           
        textFile.close ();
    }
    return fileArray;
}

// ---------------------------------------------------------------------------------------

// read the fader settings from the fadeSettings.txt file in the User Data folder
function getFadeSettings()
{
    var fade =  { length:0, type:0, bend:0 } 

    // try to load from file, if fail, use default settings
    try
    {
        var fadeSettings = readTextFile(scriptTitle, "fadeSettings")
        var data = fadeSettings[0].split("|");
        fade.length = Number(data[0]);
        fade.type = Number(data[1]);
    }
    catch(err)
    {
        // default settings if nothing has been saved yet
        fade.length = 0.005;
        fadeType = 1;
        bend = 0.6571009159088134765625;
    }

    if (fade.type == 2) {fade.bend = 0.14595067501068115234375} else {fade.bend = 0.6571009159088134765625}

    return( fade )
}
// endregion