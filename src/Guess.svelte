<script>
import { createEventDispatcher } from 'svelte';
export let word ='';

const dispatch = createEventDispatcher();
// const letterStates = ["green", "yellow", "grey"];
$: letters = [...word];
$: valid = false;
let wordleResult = [{},{},{},{},{}];
/* eg
  [{ letter:'a', value:'yellow' },
  { letter:'r', value:'yellow' },
  { letter:'o', value:'yellow' },
  { letter:'s', value:'grey' },
  { letter:'e', value:'grey' }]
*/


function cycleLetterState(letter, i){
  let states = ["grey","yellow","green"];
  console.log('cycle', letter, i);
  if(!wordleResult[i].letter){ 
    wordleResult[i] = { 
      letter,
      value: 'grey'
    }
  }
  let nextState = (states.findIndex(s=>s==wordleResult[i].value)+1)%states.length;
  wordleResult[i].value = states[nextState]; 
  valid = wordleResult.reduce((acc, d)=>{
    console.log(d);
    return d.letter != undefined && acc
  }, true);
}

function submit(){
  dispatch('submit', wordleResult);
  wordleResult = [{},{},{},{},{}];
  word = '';
  valid = false;
}

</script>
<p>
  {#each letters as letter, i }
  <div class="letter {wordleResult[i] ? wordleResult[i].value:'not'}" on:click={()=>cycleLetterState(letter, i)}>{letter}</div>
  {/each}
  {#if valid}
  <button on:click={submit}>Refine suggestions</button>
  {/if}
  {#if letters.length > 0 }
    <p class="instructions">Click the letters to cycle through the colours</p>
    <ul class="key">
      <li class="yellow swatch">Yellow: right letter, wrong place</li>
      <li class="green swatch">Green: right letter, right place</li>
      <li class="grey swatch">Grey: wrong letter</li>
    </ul>
  {/if}
</p>
<style>
  .letter{
    border:1px solid black;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width:2rem;
    height:2rem;
    font-size: 1.6rem;
    text-transform: uppercase;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
  }
  .instructions{
    margin-bottom:0.1rem;
  }
  .swatch{
    list-style: none;
    padding-left:0px;
  }
  .key{ 
    margin-top: 0.1rem;
    font-size: 0.7rem; 
    padding-left:0px;
  }
  .yellow{
    background-color: yellow;
  }
  .grey{
    background-color: grey;
    color:white;
  }
  .green{
    background-color: greenyellow;
  }
</style>