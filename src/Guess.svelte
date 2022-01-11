<script>
  import Letter from './Letter.svelte';
  //   const modes = ['unnknown','correctletter','correctposition','exclude'];
  export let word = '';
  export let knownLetters = [];
  export let knownPositions = [];
  export let excludedLetters = [];
  export let validResult;

  let letterState = [0, 0, 0, 0, 0];
  $: letters = word.split('')
  $: {
    knownLetters = [];
    excludedLetters = [];
    knownPositions = [];
    validResult = true;
    letterState.forEach((mode, i) => {
      if(mode==0){
        validResult = false;
      }else if(mode==1){
        knownLetters.push(word[i]);
        knownLetters = knownLetters
      }else if(mode==2){
        knownPositions[i] = word[i];
      }else if(mode==3){
        excludedLetters.push(word[i]);
        excludedLetters = excludedLetters;
      }
    });
  };


</script>
{#each letters as letter, i}
<Letter bind:modeIndex={letterState[i]} letter={letter} />
{/each}
<div class:valid={validResult}></div>
<style>
  div{
    width:20px;
    height:20px;
  }

  .valid{
    background: greenyellow;
  }
</style>