
export async function checkProgress() {
  const resp = await fetch(`/sdapi/v1/progress?skip_current_image=false`);
  const data = await resp.json();
  console.log(data.textinfo, data.progress, data.eta_relative);
  if (!data.state.interrupted) {
    setTimeout(checkProgress, 300);
  }
}