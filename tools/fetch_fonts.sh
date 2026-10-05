#!/usr/bin/env bash
# Download the OFL fonts used by the video from the google/fonts repository.
set -euo pipefail
cd "$(dirname "$0")/../mv/assets/fonts" 2>/dev/null || { mkdir -p "$(dirname "$0")/../mv/assets/fonts"; cd "$(dirname "$0")/../mv/assets/fonts"; }
B=https://raw.githubusercontent.com/google/fonts/main/ofl
get() { [ -f "$2" ] || curl -fsSL -o "$2" "$B/$1"; echo "ok $2"; }
get shipporiminchob1/ShipporiMinchoB1-Medium.ttf ShipporiMinchoB1-Medium.ttf
get shipporiminchob1/ShipporiMinchoB1-Bold.ttf ShipporiMinchoB1-Bold.ttf
get shipporiminchob1/ShipporiMinchoB1-ExtraBold.ttf ShipporiMinchoB1-ExtraBold.ttf
get zenoldmincho/ZenOldMincho-Regular.ttf ZenOldMincho-Regular.ttf
get zenoldmincho/ZenOldMincho-Black.ttf ZenOldMincho-Black.ttf
get zenkakugothicnew/ZenKakuGothicNew-Medium.ttf ZenKakuGothicNew-Medium.ttf
get zenkakugothicnew/ZenKakuGothicNew-Bold.ttf ZenKakuGothicNew-Bold.ttf
get "playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf" PlayfairDisplay.ttf
get "playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf" PlayfairDisplay-Italic.ttf
get "cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf" CormorantGaramond.ttf
get "cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf" CormorantGaramond-Italic.ttf
get "bodonimoda/BodoniModa-Italic%5Bopsz,wght%5D.ttf" BodoniModa-Italic.ttf
get pinyonscript/PinyonScript-Regular.ttf PinyonScript-Regular.ttf
get "cinzel/Cinzel%5Bwght%5D.ttf" Cinzel.ttf
