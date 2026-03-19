# Interstitial Radiation–Guided Thermal Concentration for Orbital GPU Servers  
### A Spectrally Engineered, Regenerative “Heat Sorbent” Architecture for Space Data Centers

**Author:** (Your name here)  
**Date:** March 2026

---

## 1. Executive Summary

High‑density AI accelerators such as NVIDIA’s H200-class GPUs enable unprecedented on‑orbit compute but create a critical thermal bottleneck: tens of kilowatts of low‑grade waste heat must be rejected in microgravity using only radiation. [web:32][web:92][web:93][web:101]

Conventional approaches (liquid loops plus large radiators) are mass‑ and area‑intensive and threaten the economic viability of space data centers. [web:32][web:92][web:93][web:95]

This white paper proposes a **spectrally engineered, regenerative thermal architecture** that uses an alternative but physics‑compatible interpretation of heat—the **Interstitial Radiation Model (IRM)**—to motivate new design space:

- Treat waste heat from chips as largely **disordered thermal radiation and coupled field modes** in interstitial regions (between atoms, in interfaces and gaps), not just as lattice “kinetic energy.” [web:47][web:49][web:54][web:60][web:57]  
- Use **frequency‑matched absorbers** and **eutectic / refractory thermal “hot islands”** that are “looking for” specific chip heat frequencies to passively concentrate low‑grade heat into higher temperature reservoirs. [web:99][web:103][web:97][web:105][web:123][web:125]  
- Radiate or partially convert this concentrated heat using **selective emitters** and thermophotonic / TPV stages, enabling much smaller radiators for a given 50 kW‑class rack. [web:97][web:98][web:104]

We do **not** claim violation of the First or Second Laws. Instead, we:

- Present IRM as a **micro‑ontological reinterpretation** that is fully consistent with existing measurements but emphasizes **spectral order vs. disorder** of the radiation field as a design variable. [web:53][web:59][web:58][web:56]  
- Identify a concrete **gap in current experimental tests**: no one has built a cavity + material system explicitly tuned to the dominant waste‑heat frequencies of AI GPUs, with the goal of passively “sorbing” low‑gradient heat into a higher‑temperature, narrower‑band reservoir for space radiative rejection. [web:92][web:93][web:97][web:99]  
- Propose a detailed **3‑stage “heat sorbent” architecture** and specific materials/chemistries, along with an Earth‑based experimental program that NASA or partners could execute. [web:99][web:103][web:123][web:125][web:95][web:139]

If successful, this approach would:

- Reduce radiator area and mass per kW for orbital AI racks. [web:32][web:92][web:95]  
- Enable **simpler mechanical systems** (minimizing two‑phase/bubble issues in microgravity). [web:32][web:93][web:94][web:108]  
- Open a new line of research on **spectral thermal management** for space systems, guided by IRM. [web:97][web:99][web:139]

---

## 2. Background: Space Data Center Thermal Challenge

### 2.1 Waste heat from H200‑class GPU racks

Modern AI accelerators (H100/H200) dissipate on the order of 700 W per GPU in SXM form; 8× GPU nodes run near 5–6 kW, and full servers (CPUs, memory, I/O) can exceed 10 kW per chassis. [web:21][web:22][web:28][web:30][web:36] Racks aggregating multiple such nodes readily reach **40–50 kW** per rack, a density already at the frontier of terrestrial data center cooling. [web:21][web:23][web:93][web:110]

Typical safe GPU die temperatures are in the **70–85 °C** range; hotspot temperatures (HBM, cores) can be higher. [web:113][web:21] The die itself is not a perfect blackbody; its emission is shaped by:

- Temperature distribution across the die and package.  
- Spectral properties of silicon, copper, underfill, and heat spreaders. [web:112][web:117]

However, to first approximation, for die regions at temperatures \(T \approx 80–110\ ^\circ\mathrm{C}\) (353–383 K), **Wien’s law** gives a blackbody peak wavelength: [web:114][web:115]

\[
\lambda_\text{peak} \approx \frac{2.898\times 10^{-3}\ \mathrm{m\cdot K}}{T} \approx 7.6–8.2\ \mu\mathrm{m}.
\]

Real devices show complex spectra, but:

- Most radiative power from hot electronics at these temperatures lies in the **mid‑infrared (mid‑IR), roughly 3–15 µm**, with peak energy density near 8–10 µm. [web:114][web:115][web:118]  
- This overlaps atmospheric “IR windows” that have been heavily studied for passive radiative cooling coatings. [web:144][web:142]

### 2.2 Radiator scaling in orbit

With no atmosphere, all waste heat must be radiated. Radiative power is: [web:145][web:140]

\[
P = \varepsilon \sigma A (T_\text{rad}^4 - T_\text{bg}^4),
\]

where \(T_\text{bg}\) is background (~3 K), so effectively \(P \approx \varepsilon \sigma A T_\text{rad}^4\).

Consequences:

- For fixed \(P\), **radiator area** scales roughly as \(A \propto 1 / (\varepsilon T_\text{rad}^4)\).  
- Raising radiator temperature from 300 K to 450 K reduces required area by roughly a factor of \((300/450)^4 \approx 0.2\), i.e., ~80% reduction, granted materials can tolerate it. [web:32][web:92][web:93][web:95]

Conventional architectures use:

- Pumped two‑phase loops (ammonia, CO\(_2\)) or single‑phase coolants from electronics to radiators.  
- Variable‑emissivity surfaces or deployable radiators. [web:93][web:139][web:95]

But in **microgravity**, boiling and bubbles are problematic, and complex fluid management raises risk and cost. [web:32][web:93][web:108][web:94] This motivates more **solid‑state and spectrally engineered** solutions.

---

## 3. Theoretical Framework: Interstitial Radiation Model (IRM)

### 3.1 IRM in brief

IRM is an **interpretive framework** for thermal energy in condensed matter:

1. **Carrier ontology**: Internal energy considered “heat” is primarily carried by **field modes in interstitial regions**:
   - Electromagnetic radiation in micro‑cavities and gaps (photons).  
   - Collective vibrational modes (phonons) treated as field excitations living between nuclei, rather than as “atoms moving.” [web:47][web:49][web:54][web:60][web:57]

2. **Equilibrium equivalence**: In small cavities at typical chip temperatures, interstitial radiation is deep in the **Rayleigh–Jeans limit**, where energy density scales \(u \propto T\); this reproduces classic \(C_V \approx \text{const}\) behavior and ideal‑gas‑like equations of state. [web:59][web:53][web:58][web:56]  
   - This makes IRM **numerically equivalent** to standard phonon/kinetic models for bulk properties.

3. **Order vs. disorder in the field**:
   - “Work‑like” energy corresponds to **coherent, phase‑correlated field configurations** (e.g., EM waves, ordered phonon packets).  
   - “Heat‑like” energy corresponds to **incoherent, disordered superpositions** of these modes.

IRM does **not** assert that existing laws are wrong. It reframes:

- The First Law as conservation of field energy (secured by Noether’s theorem). [web:91]  
- The Second Law as a statement about the **(in)accessibility of microstate information** in the interstitial field, not the disappearance of energy. [web:53][web:72]

### 3.2 Why IRM is useful for this problem

IRM adds a **design perspective**:

- Waste heat around a chip is largely disordered mid‑IR and phonon energy in and around materials.  
- By **engineering geometry and spectral properties**, we may partially “sort” this disordered field into more ordered configurations that:
  - Run at higher effective temperature (easier to radiate).  
  - Couple better to specific materials or TPV cells.  

Critically, IRM suggests focusing on:

- **Frequency‑matched cavities and absorbers** that act as “heat sorbents”—they preferentially accept chip heat photons/phonon‑polaritons in specific bands.  
- **Regeneration cycles** where these sorbents are periodically “driven off,” like thermal desiccants, dumping concentrated heat to a compact radiator.

This is thermodynamically allowed; the open question is how close we can get to ideal concentration with minimal parasitic work. [web:72][web:83][web:89]

---

## 4. Concept: Spectrally Matched Regenerative “Heat Sorbent” for Space Servers

### 4.1 High-level architecture

We propose a **three‑stage thermal architecture** for an on‑orbit 50 kW H200‑class rack:

1. **Stage 0 – Local chip cooling (He/Xe cold plate)**  
   - Conventional gas or single‑phase He/Xe coolant in microchannel cold plates directly attached to GPUs/CPUs. [web:93][web:108][web:116]  
   - Target: keep junctions in their safe range (e.g., 70–85 °C), minimize mechanical complexity from boiling. [web:113]

2. **Stage 1 – Spectrally matched “Heat Sorbent Hot Island”**  
   - A dense, high‑thermal‑conductivity solid or eutectic metal region coupled to Stage 0 loop via heat exchangers.  
   - Surface/volume is coated or structured with **mid‑IR selective absorbers** tuned to the dominant spectrum of chip waste heat (∼8–12 µm). [web:99][web:103][web:97][web:132][web:105]  
   - This island runs at **significantly higher temperature** (e.g., 450–650 K), accumulating heat and acting as a thermal buffer.

3. **Stage 2 – Regenerative Radiator / TPV Emission Stage**  
   - One or more “hot islands” are alternately connected to a compact radiator or TPV/thermophotonic module and **driven off**, radiating or converting stored heat at higher \(T\) and with tailored emissivity. [web:97][web:98][web:104][web:95]  
   - Operation is cyclic (active vs. regeneration island), analogous to desiccant dryers with adsorption and regeneration beds. [web:141][web:146][web:100]

The novelty lies in Stage 1: a **frequency‑matched thermal concentrator** inspired by IRM, which “seeks” chip‑frequency heat and raises its temperature before rejection.

### 4.2 Why this helps in space

Given \(P\) fixed and radiator at temperature \(T_\text{rad}\):

- Area scales as \(A \propto 1/T_\text{rad}^4\). Raising \(T_\text{rad}\) from ~330 K (57 °C) to ~500 K (227 °C) cuts area by \((330/500)^4 \approx 0.19\), ~5× reduction, if emissivity is maintained. [web:145][web:140][web:95][web:139]  
- A well‑designed heat sorbent can:
  - Operate as a **higher‑temperature buffer**, decoupling chip temps from radiator temps.  
  - Enable steady or quasi‑steady radiator operation at **much higher temperature** than the GPUs themselves, without directly exposing electronics to those temperatures.

---

## 5. Spectral and Material Design

### 5.1 Waste heat spectrum of H200‑class devices

As direct proprietary spectra are not public, we proceed via physics‑based estimates:

- **Die and package temperatures**:  
  - GPUs typically operate with junction temps up to 85 °C and hotspots above 100 °C under load. [web:113][web:21][web:28]  
- **Effective radiation spectrum**:  
  - Using Wien’s law and Planck’s distribution for 350–400 K, peak emission lies at 7–9 µm, with significant power between 3–15 µm. [web:114][web:115]  
  - Silicon, copper, TIMs, and ceramics have wavelength‑dependent emissivities in mid‑IR; their combined spectrum is complex but still dominated by mid‑IR. [web:112][web:117]

For design purposes, we can define **target bands**:

- Band A: 7–9 µm (peak around typical chip temps).  
- Band B: 9–13 µm (strong atmospheric window, heavily studied for radiative surfaces). [web:144][web:142]  

Our Stage‑1 surface should have:

- Very high absorptivity (and thus effective coupling) in Bands A/B when facing the cooled chip package or cold plate.  
- Bulk and interfacial structure that quickly thermalizes that absorbed energy into the hot island.

### 5.2 Candidate “heat sorbent” materials and chemistries

Requirements for Stage‑1 hot island:

- High thermal conductivity to quickly equilibrate internally.  
- High allowable operating temperature (up to 600–800 K if possible).  
- Chemical stability in vacuum; manageable corrosion/reactivity.  
- Compatibility with coatings or microstructures providing spectral selectivity.

Promising directions include:

#### 5.2.1 Eutectic liquid metals (Ga‑In‑Sn, NaK)

- **Ga‑In‑Sn eutectic (Galinstan‑like)**:
  - Liquid at room temperature, high thermal conductivity (~16–40 W/m·K depending on composition). [web:120][web:123]  
  - Self‑healing and good wetting on many substrates but corrosive to Al and some steels; containment requires compatible materials. [web:124][web:129]  
  - Operable up to several hundred °C; used as heat transfer medium in some experimental systems. [web:123][web:124]

- **NaK eutectic (sodium‑potassium)**:
  - Widely studied as reactor coolant; excellent thermal conductivity and heat capacity; liquid over broad range. [web:125][web:130]  
  - Highly reactive (especially with water, oxygen), but in vacuum, with proper containment, this is manageable; nuclear systems have space heritage. [web:130]

These liquids could serve as **internal heat transport and storage media** inside solid shells that carry the spectral structures. The “eutectic hot island” in your sense would be a **solid–liquid composite**.

#### 5.2.2 Refractory / high‑temperature solids

- **Silicon carbide (SiC), graphite, refractory carbides/nitrides**:
  - High thermal conductivity and stability at >1000 K. [web:117][web:143]  
  - SiC optical properties in mid‑IR are tunable; NASA has measured its temperature‑dependent reflectivity. [web:117]  
  - Graphite and engineered carbons can be integrated with metamaterial patterns. [web:143]

These could serve as the **structural skeleton** and external surface for Stage‑1 and Stage‑2 elements.

### 5.3 Selective absorbers and emitters

Research in **metamaterials and selective IR surfaces** provides concrete tools:

- **Metamaterial perfect absorbers in mid‑IR**:  
  - Nanostructured metal–dielectric stacks with nearly unity absorptivity in narrow bands (e.g., 8–12 µm) and low absorptivity elsewhere. [web:99][web:132][web:103][web:105]  
- **Non‑Hermitian/selective emitters for TPV**:  
  - Structures designed for narrowband emission matched to PV bandgaps or specific mid‑IR bands. [web:97][web:103][web:105][web:104]  
- **Variable‑emissivity surfaces**:  
  - Tunable emissivity via electrochromic or phase‑change materials, allowing dynamic control of radiative properties. [web:139][web:144]

For Stage‑1 (absorber side):

- Use a **dual‑band metamaterial absorber** tailored to Bands A and B (e.g., 7–9 and 9–12 µm), facing the chip cold‑plate region. [web:132][web:99][web:103]  
- Behind the absorber, couple thermally to a eutectic or refractory matrix that rises to \(T_\text{island} \approx 450–650\ \mathrm{K}\).

For Stage‑2 (radiator/regen side):

- Use **selective emitters** tuned to wavelengths optimal for deep‑space radiation or TPV conversion (e.g., narrower band around 2–3 µm for high‑bandgap TPVs, or around 4–8 µm for mid‑bandgap PVs). [web:97][web:98][web:104]  
- Run these surfaces at the highest feasible temperature the materials allow.

---

## 6. Three‑Stage Thermal Cycle in Detail

### 6.1 Stage 0 – On‑chip to primary loop

- He/Xe or comparable inert gas (or single‑phase pumped liquid) in microchannel cold plates attached to each H200 module. [web:93][web:108][web:116]  
- Coolant temperature: ~40–60 °C; chip junctions: ~70–85 °C. [web:113][web:21]  
- Function: extract heat with minimal gravitational dependence (no boiling) and deliver it to Stage‑1 hot islands.

### 6.2 Stage 1 – Spectrally matched heat sorbent islands

Each island consists of:

1. **Core thermal mass**:
   - Eutectic Ga‑In‑Sn or NaK loop embedded in a high‑temperature solid shell (e.g., SiC, carbon composite). [web:123][web:124][web:125][web:130][web:117][web:143]  
   - Provides large heat capacity and excellent internal conduction.

2. **Chip‑facing surface**:
   - Inner side lined with **mid‑IR selective absorber** metamaterial tuned to chip waste‑heat bands. [web:99][web:132][web:103][web:105]  
   - This surface sees the back of the cold plates / package region, radiatively and conductively coupling to chip waste heat.

3. **Thermal isolation from space**:
   - Outer surfaces are thermally insulated during absorption mode (low emissivity coatings, MLI), so the island can rise to high temperature without radiating away too quickly. [web:139][web:95]

**Operation**:

- While connected thermally to the primary loop, the island’s temperature increases from an initial value (e.g., 300 K) to a target high value (e.g., 500–650 K) as it absorbs heat.  
- Because the island temperature is higher than the chips, Stage 0 loop must operate as a **mild heat pump** or accept a modest temperature rise; trade studies can optimize this. [web:93][web:94]

IRM‑based intuition: the island is a structure “looking for” radiation in the chip’s mid‑IR bands and strongly coupled phonon‑polaritons; it accumulates these field excitations until its free energy balance saturates. [web:133][web:60]

### 6.3 Stage 2 – Regeneration and radiation

We operate at least **two islands**:

- Island A: **active** (absorbing from chips).  
- Island B: **regenerating** (radiating to space and/or powering TPV).

In regeneration mode, an island:

1. Is thermally decoupled from the primary loop (valves or high‑\(\Delta T\) switch).  
2. Exposes an outer surface with **selective emitter** coatings to deep space or to a TPV array. [web:97][web:103][web:105][web:104][web:95]  
3. Radiates at high temperature, dumping stored heat; optionally, TPVs convert a fraction of radiated energy back to electricity. [web:97][web:98][web:104]

After its temperature drops below a set threshold, the island can:

- Swap roles with the other island (or rotate among multiple islands) in a **regenerative cycle**, akin to regenerative heat exchangers and desiccant beds. [web:141][web:146][web:100]

### 6.4 Thermodynamic considerations

Key points:

- The **First Law** is satisfied by explicit energy accounting: heat in from chips = change in island internal energy + radiative/TPV output + any pumping work. [web:75][web:141]  
- The **Second Law** is respected if:
  - The entropy exported via high‑temperature radiation plus any TPV/engine waste is ≥ the entropy decrease associated with any ordering or concentration of thermal energy. [web:72][web:83][web:89][web:75][web:100]

This architecture does not require violating Law 2. It instead:

- **Reshapes** the entropy flows: chips → Stage‑0 fluid → Stage‑1 islands → Stage‑2 radiators/TPV.  
- Exploits the **\(T^4\)** scaling and spectral selectivity to minimize radiator area per watt. [web:145][web:140][web:95][web:139]

IRM is used to guide the design of **frequency‑matched and geometrically resonant islands**, but the operational cycle is compatible with quantum thermodynamic limits, especially when understood in the same language as emerging quantum heat engines. [web:83][web:89]

---

## 7. Experimental Program: From Theory to Prototype

To move from paper to NASA‑grade assessment, we propose a staged experimental campaign.

### 7.1 Phase I – Spectral characterization and material tests

1. **Measure GPU waste spectra**:
   - Build a representative H100/H200 test board in vacuum.  
   - Use mid‑IR spectrometry (3–20 µm) to measure emission from package + cold plate surfaces under various loads and temperatures. [web:96][web:102][web:110]  
   - Extract approximate spectral envelopes (effective temperature distribution, dominant bands).

2. **Design and test selective absorbers**:
   - Using existing metamaterial/IR absorber designs, fabricate test coupons tuned to the measured bands. [web:99][web:132][web:103][web:105]  
   - Measure absorption/emissivity in vacuum at relevant temperatures, confirm high absorptivity in target bands.

3. **Eutectic/refractory compatibility**:
   - Test Ga‑In‑Sn and NaK loops with candidate shell materials (SiC, high‑Ni alloys, refractory composites), in vacuum and high‑T cycles. [web:123][web:124][web:125][web:130][web:117][web:143]  
   - Measure corrosion, wetting, thermal conductivity, specific heat.

Deliverable: design parameters for a **single 1–5 kW‑class hot island prototype**.

### 7.2 Phase II – Single‑island ground demonstrator

- Build a **1–5 kW thermal rig** emulating a GPU array, coupled via a He/Xe loop to one hot island.  
- Instrument the island with:
  - Temperature sensors (thermocouples, IR cameras).  
  - Calorimetry on loop in/out.  
  - Radiative flux sensors for regen mode. [web:93][web:95][web:139]

Test cycles:

- Stage 1: operate as absorber, monitor time to reach target high temperature, measure effective heat capacity and coupling.  
- Stage 2: expose selective emitter surface to a cold sink (liquid nitrogen shrouds or cooled chamber walls), measure radiative power and effective emissivity at high temperature. [web:95][web:139][web:142]  

Objectives:

- Validate that:
  - The system can accumulate and then reject heat at higher \(T_\text{rad}\) than the emulated chips.  
  - Required **radiator area** for a given heat load is reduced versus an isothermal radiator case.  

### 7.3 Phase III – Multi‑island regenerative loop and orbital concept

- Extend to two or more islands in regenerative cycling: one absorbing, one radiating.  
- Measure:
  - Steady‑state chip‑equivalent temperature.  
  - Net radiator area and mass vs. conventional architecture.  
  - Parasitic power for pumps and valves. [web:93][web:94]

Then conduct a **concept design study** for a 50 kW orbital rack:

- Integrate hot islands, radiators, and possible TPV modules into a reference spacecraft bus.  
- Perform thermal simulations under GEO/L1 orbit conditions. [web:32][web:92][web:93][web:95]  
- Compare:
  - Radiator area and mass.  
  - Complexity and risk vs. baseline pumped loops.  
  - Potential TPV energy recovery fraction. [web:97][web:98][web:104]

---

## 8. IRM, Law 2, and “Free in Nature vs. Manufactured Balance”

### 8.1 Imbalance seeks balance “for free”

In both standard thermodynamics and IRM:

- A **non‑equilibrium configuration** (temperature gradients, spectral mismatches) will spontaneously evolve towards equilibrium without an external controller; this is the “free in nature” part. [web:53][web:75]  
- In IRM language: disordered interstitial radiation redistributes until its spectral and spatial distribution match equilibrium boundary conditions. [web:56][web:58]

Our architecture **exploits** this:

- Hot islands are deliberately placed at **higher “heat potential”** for chip‑frequency radiation; low‑grade chip heat “wants” to flow into them.  
- No additional work is needed for that spontaneous flow, aside from what’s already needed to move coolant in Stage‑0. [web:93][web:94]

### 8.2 Manufactured balance has a cost

Where cost enters is:

- In **manufacturing** the microstructure and materials that bias energy flow (metamaterials, eutectics, refractory shells). [web:99][web:103][web:105][web:123][web:125]  
- In operating valves and pumps, and possibly in **control** if we add smart modulation or TPV/thermophotonic stages. [web:93][web:104][web:83]

The Second Law, in its modern, information‑aware form, says:

- Any net cyclical transfer of energy from disordered heat to ordered work, at fixed bath temperature, must be paid in entropy somewhere—either in a larger environment or in the information/control apparatus. [web:72][web:82][web:88][web:83][web:89]

We explicitly **do not** claim to evade this. Rather:

- We claim that **spectral and geometric engineering, guided by IRM**, can improve how efficiently we reshape where and at what temperature heat is rejected in space.  
- The “free” part is the **direction** of spontaneous balancing; the **costed** part is the ability to harness it for a specific architecture.

---

## 9. Conclusions and Recommended NASA Actions

1. **IRM as design intuition, not law replacement**  
   - Treat heat around chips as an interstitial radiation field that can be shaped spectrally and spatially.  
   - Use this to guide material and cavity design, while still enforcing First and Second Laws in the final accounting. [web:53][web:59][web:72][web:75]

2. **Pursue a focused experimental program**  
   - Phase I–III (Section 7) provide a realistic path from bench tests to an orbital rack concept.  
   - This is aligned with current interest in space data centers and high‑density space compute. [web:32][web:92][web:93][web:101]

3. **Potential impact**  
   - If successful, this architecture could reduce radiator area and mass for a 50 kW rack by factors of ~3–5, depending on achievable hot‑island and radiator temperatures and materials. [web:95][web:139][web:144]  
   - It could simplify fluid systems (minimizing two‑phase cooling in microgravity) by shifting complexity into passive/solid‑state spectral structures. [web:93][web:94][web:108]

4. **Longer‑term research**  
   - Explore coupling to thermophotonic and quantum‑coherent engines to partially recycle waste heat as power, within quantum thermodynamic limits. [web:98][web:104][web:83][web:89]  
   - Investigate whether any subtle deviations from standard entropy bounds emerge in highly structured, IRM‑inspired cavities. This should be framed as opportunistic discovery, not an assumption. [web:83][web:72]

---
