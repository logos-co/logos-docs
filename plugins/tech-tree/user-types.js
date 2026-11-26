// The `user_type` front matter values every procedure carries, one per page.
// The criteria for each are the journey fit checklists in
// .github/ISSUE_TEMPLATE/doc-packet.yml. Shared by the build check and the
// tech tree's filter, so it has no Node.js imports.

const USER_TYPES = [
  {id: 'gui_user', label: 'GUI user'},
  {id: 'cli_user', label: 'CLI user'},
  {id: 'developer', label: 'Developer'},
  {id: 'node_operator', label: 'Node operator'},
];

module.exports = {USER_TYPES};
