<script>
  const modes = ['unnknown','correctletter','correctposition','exclude'];
  export let modeIndex = 0;
  export let letter ='';
  $: mode = modes[modeIndex];
  function cycle(){
    modeIndex = (modeIndex+1)%modes.length;
  }
</script>
<div class={mode} on:click={cycle}>{letter}</div>
<style>
  div{
    font-weight: bolder;
    border: 1px solid black;
    display: inline-flex;
    font-size: 3rem;
    width:4rem;
    height:4rem;
    justify-content: center;
    align-items: center;
    text-transform: uppercase;
    user-select: none;
    cursor: pointer;
    margin: 0.2rem;
  }
  .unknown{
    background: white;
  }
  .correctletter{
    background: yellow;
  }
  .correctposition{
    background: rgb(30, 255, 0);
  }
  .exclude{
    background: black;
  }
</style>