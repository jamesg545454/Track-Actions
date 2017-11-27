# Track-Actions Package

Adds new actions to **Presonus Studio One** 3.5 or greater as described below.  <br>

**Installation:** Download [the package file from here](https://github.com/ExpressMix/Track-Actions/raw/master/trackactions.package) and put it in the **Studio One 3\Scripts** folder and restart Studio One. <br>

---

**List Of Actions Included in The Package**<br>

**Version 1.0.0** <br>

+ **Fade at Split** <br>
Fading out and in at a clip split point based on custom fade settings. This works from right to left because the selected clip after a split defaults to the clip to the right of the split. If using it manually on an existing split, select the clip on the right.

<img src="https://image.prntscr.com/image/GGktBg6oQq2-9Js5CL_FaQ.gif" width="300" height="250" align="middle" />

+  **Fade In/Out** <br>
  Two actions to fade clips only in or out. This is more flexible than Create Autofades as it uses the custom fade settings and only fades in or out, not both at the same time, which in some cases can inadvertently affect a transient at the clip start if the clip start is trimmed close to a drum transient or similar.

+  **Fade Settings** <br>
  Dialog: Set the length and type of fade to use for the fade actions.

+  **Remove Inactive Layers** <br>
  This removes all inactive layers for a selected single track. It makes a version backup before removing layers, *[Track Name] Before 
  Removing Layers*.  Note: I can't yet get this working for all selected tracks but if I ever can I will update it.

+  **Remove Empty/Disabled Tracks** <br>
These two actions remove all visible tracks that have no media clips on their active layers or are disabled in the second case. It makes a version backup before removing tracks, *Before Removing Empty [or Disabled]*

+  **Filter Tracks** <br>
  Dialog: Only show the arrange tracks which contain the case insensitive search text, hide all others. *This action requires that **Track > Select Scene 1** be set to make all tracks visible for it to work correctly. It's a work in progress and has to exclude folder tracks by necessity.*
  
  
![alt text](https://image.prntscr.com/image/R_BDBb1QR7u722a-CaYmyw.gif)

+  **Replace Track Names** <br>
  Dialog: Batch replace track names, case sensitive matching.

+  **Toggle Dim Master Bus** <br>
  Toggle between Unity and Dim Level. Default -10 dim level. Customize dim level by appending the master bus name. <br>
  *["Master - 20"]*

+  **Format Track Names** <br>
  Batch format track names, *i.e., bAsS > Bass*.

+  **Reset Console** <br>
  Faders to 0, pans center, plugins off. Makes a version backup before reset *[Before Console Reset]*
  
  ---

**Version 1.0.1** <br>

+ **Nudge Play Cursor** - **Nudge Play Cursor Back** <br>
These move the play cursor forward or backward by the grid value if snap is on or if snap is off in 1 ms steps.  These actions exist in the **Track** command category to allow them to be non-contextual to media selection and also because the Transport category is not available to categorize scripted actions.

---

**Version 1.0.2**
+ **Fixed:** Non-fatal error with **Remove Inactive Layers** if no arrange track is selected. <br>
+ **Change:** Adjusted **Track Filter** form and controls.

**Version 1.0.3**

+ **Add:** Consolidated the **Midi Logical Editor** into the package.<br>

![alt text](https://image.prntscr.com/image/Qc-KR_zbSRCBKmLSj47x6w.png)
