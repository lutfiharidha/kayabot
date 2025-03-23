import { exec } from "child_process";
import { config } from "../config";

export function playSound() {
  const text = config.token_buy.play_sound_text;
  const command = `powershell -Command "(New-Object -com SAPI.SpVoice).speak('${text}')"`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return false;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return false;
    }
    console.log("Speech executed successfully");
    return true;
  });
}
