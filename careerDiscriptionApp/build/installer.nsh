!macro customInstall
  ; Create folders for organization
  CreateDirectory "$INSTDIR\License"
  CreateDirectory "$INSTDIR\Etc"

  ; Move license files
  Rename "$INSTDIR\LICENSE.electron.txt" "$INSTDIR\License\LICENSE.electron.txt"
  Rename "$INSTDIR\LICENSES.chromium.html" "$INSTDIR\License\LICENSES.chromium.html"

  ; Move locales folder
  Rename "$INSTDIR\locales" "$INSTDIR\Etc\locales"
!macroend

!macro customUninstall
  ; Clean up the created folders
  RMDir /r "$INSTDIR\License"
  RMDir /r "$INSTDIR\Etc"
!macroend
