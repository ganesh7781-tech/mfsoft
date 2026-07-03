const bcrypt = require('bcryptjs');

const hash = '$2b$10$suzvGM0nia.PWeRzF/FXEuUvdDdXlSRO7bpUwltN.CMQLpcUpJA1a';

bcrypt.compare('olympus123', hash).then(res => {
  console.log("Password 'olympus123' match:", res);
});
