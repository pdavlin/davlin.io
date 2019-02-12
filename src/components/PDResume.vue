<template>
  <div class="resume-container">
    <div class="resume-top-text">Patrick O. Davlin</div>
    <div class="resume-title-bar">
      <h1>About Me</h1>
    </div>
    <div class="resume-content">
      <p>I am an Omahan looking to use my technical, personal, and organizational skills to improve my life and my community. I'm fascinated by education and its impact on peoples' lives, and looking to advance that goal however I can.</p>
      <p>When I'm not doing those things, though, I am a big fan of listening to music and making coffee.</p>
    </div>
    <div class="resume-title-bar">
      <h1>Work Experience</h1>
    </div>
    <div class="resume-content">
      <br>
      <h2>Union Pacific Railroad</h2>
      <h3>Information Assurance Engineer</h3>
      <h4>November 2017 - Present</h4>
      <ul>
        <li>Implemented complete, highly-available multifactor authentication infrastructure at enterprise scale using open-source and vendor-provided components</li>
        <li>Deployed Yubikey 4 and 5 tokens to 17,000 enterprise Windows users</li>
        <li>Coordinated with management teams across enterprise to create and enforce suitable deployment and utilization processes</li>
        <li>Developed and deployed complete full-stack application suite enabling users to self-manage credentials and generate temporary Windows passwords, given proper authorization and access permissions</li>
        <li>Built and administrated kiosk machines to allow users to self-manage credentials when locked out of personal machines</li>
        <li>Developed frontend components and training for Attribute-Based Access Control system</li>
        <li>Supported Siteminder/CA Single-Sign On infastructure for all enterprise applications and SAML 2.0 configurations</li>
      </ul>
      <h2>Hayneedle, Inc.</h2>
      <h3>Frontend Engineer</h3>
      <h4>May 2017 - October 2017</h4>
      <ul>
        <li>Supported production eCommerce application issues impacting customers</li>
        <li>Converted web from legacy ColdFusion 8 to Angular 2+ platform</li>
        <li>Managed and organized product SKUs using large-scale databases in MySQL and Postgres</li>
        <li>Worked in an "on-demand" team to push Angular 2+ features to production with minimal turnaround</li>
      </ul>
    </div>
    <div class="resume-title-bar">
      <h1>Education</h1>
    </div>
    <div class="resume-content">
      <br>
      <h2>University of Nebraska at Omaha</h2>
      <h3>M.S. Computer Science &#8901; January 2019 - Ongoing</h3>
      <h4>Emphasis: Artificial Intelligence</h4>
      <br>
      <h2>University of Nebraska - Lincoln</h2>
      <h3>B.S. Computer Engineering &#8901; May 2017</h3>
      <h4>Notable Coursework:</h4>
      <ul>
        <li>Computer Engineering Capstone: high-frequency transmission, storage, and visualization of patient cardiovascular data using microcontroller and desktop systems</li>
        <li>Union Pacific-sponsored Business-to-Business Marketing course: First-place team in competitive research and presentation of real-world railroading business studies</li>
        <li>Independent study and defense of organizational psychology application and impact in academic and enterprise environments</li>
      </ul>
      <br>
    </div>
    <div class="resume-title-bar">
      <h1>Involvement and Recognition</h1>
    </div>
    <div class="resume-content max-width">
      <br>
      <h2>Employment</h2>
      <ul>
        <li>
          Union Pacific TIES (Young Professionals) member
          <em>2018 - Present</em>
        </li>
        <li>
          Union Pacific/UNO Marketing Class Employee Leader
          <em>2018 - Present</em>
        </li>
      </ul>
      <h2>Undergraduate Education</h2>
      <ul>
        <li>
          UNO Student Body President/Regent
          <em>April 2016 – May 2017</em>
        </li>
        <li>
          UNO Chancellor Search Advisory Committee Member
          <em>December 2016 – May 2017</em>
        </li>
        <li>
          Student Government Emeritus Award Recipient
          <em>April 2016, April 2017</em>
        </li>
        <li>
          UNO Student Senator
          <em>October 2013 – April 2016</em>
        </li>
        <li>
          Student Government Leadership Award Recipient
          <em>April 2015</em>
        </li>
      </ul>
      <h2>Other</h2>
      <ul>
        <li>
          Boy Scouts of America - Eagle Scout
          <em>October 2010</em>
        </li>
      </ul>
    </div>
    <div class="resume-title-bar">
      <h1>Skills</h1>
    </div>
    <div class="resume-content">
      <br>
      <h2>Languages</h2>
      <p>JavaScript, HTML5, CSS3, Java, Shell Scripting, Embedded C, Assembly (x86 and 8051), Perl, Python,</p>
      <h2>Frameworks and Tools</h2>
      <p>Angular, Vue.js, Stencil, Express, Webpack, REST APIs, Node.js, Git, Maven, Spring Boot, Linux administration</p>
      <h2>Infrastructure Technologies</h2>
      <p>Utimaco CryptoServer HSM, EJBCA Enterprise Edition, AxiadIDS Unified Credential Management System, CA Single Sign-On/Siteminder</p>
    </div>
    <div class="resume-title-bar">
      <h1>Other Interests</h1>
    </div>
    <div class="resume-content">
      <ul>
        <li>The only thing stopping me from going to every UNO hockey game is not having enough people willing to sit through all of them with me.</li>
        <li>I have six coffee machines on my kitchen counter.</li>
        <li>My favorite recreational events are any that involve distance biking and food.</li>
      </ul>
    </div>
    <div class="bottom-spacer" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class PDResume extends Vue {
  @Prop() private msg!: string;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
h2,
h3,
h4 {
  text-align: center;
  margin: 0;
}
h3 {
  font-style: oblique;
}
em {
  float: right;
}

.resume-top-text {
  text-transform: uppercase;
  font-size: 3rem;
  padding-bottom: 1rem;
  color: rgb(236, 89, 95);
}
.resume-container {
  text-align: center;
  max-width: 725px;
  padding: 0 24px;
  margin: 0 auto;
}
.resume-title-bar {
  color: rgb(236, 89, 95);
  border-top: 3px solid rgb(176, 20, 26);
  border-bottom: 3px solid rgb(176, 20, 26);
  text-align: center;
  margin: inherit;
  text-transform: uppercase;
}
.resume-content {
  margin: 0 auto;
  text-align: left;
}
.max-width {
  width: 100%;
}
.bottom-spacer {
  margin-bottom: 3rem;
}
</style>
