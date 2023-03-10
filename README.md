# Pick.al

A lightweight app to pick a random student and record participation. Register and try it out at [pick.al](https://pick.al).

The frontend (to be used on a phone in class) randomly selects a student from the roster to be called upon, and records the result:

* ✅ Solid effort answering
* ❓ Not paying attention
* ❌ Not present

[See how it works here](https://twitter.com/C_Harwick/status/1615481096161861632). There are three options for selecting students that can be set on a per-class basis:

* Random with replacement
* In order (with the current student saved across sessions)
* Random among the students who have been called on the least so far (default)

The admin backend allows class and roster management. Students can be added to classes either one-by-one or by uploading a CSV, and excused absences can be set so a student's name doesn't come up until a set date.

Bug reports and feature requests can be filed in the [issues tab](https://github.com/charwick/pick.al/issues) here on Github.

## To do

* Register and login with OrcId
* Undo and resubmit