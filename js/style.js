// Create the styles we need
const s = document.createElement('style');

export const injectStyle = () => {
  s.innerText = `
  ._detection__optionsButton{
    display: flex;
  }

  ._detection__modal{
    width: 300px;
    display: flex;
    visibility: hidden;
    flex-direction: row;
    align-items: center;
    background: white;
    position: absolute;
    top: 50px;
    border-radius: 8px;
    background: #fff;
    padding: 10px;
  }

  ._detection__modal.show {
    visibility: visible;
  }

  ._detection__modal>p{
    color: #202124;
    font-size: 13px;
    margin: 0;
    margin-right: 10px;
    font-weight: bold;
  }

  ._detection__modal>select{
    height: 24px;
    flex: 1;
  }
`;

  document.body.append(s);
};
