<script>
  export let guess = [{}, {}, {}, {}, {}];
</script>
<div>
  {#each guess as letter}
    <span class={`letter ${letter.value}`}>{letter.letter}</span>
  {/each}
</div>
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
  }
  .yellow{
    background-color: yellow;
  }
  .grey{
    background-color: grey;
  }
  .green{
    background-color: greenyellow;
  }
</style>